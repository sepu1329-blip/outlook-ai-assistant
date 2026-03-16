import type { AppSettings, Message } from "../types";

export const DEFAULT_SYSTEM_PROMPT = `You are a helpful AI assistant for Outlook.
- Output tables in Markdown format when summarizing data.
- If asked to draft a reply, detect the sender's gender from their name if possible. 
  - If male, start with "Dear Mr. [Last Name]".
  - If female, start with "Dear Ms. [Last Name]".
  - If unsure, use "Dear [Full Name]".
- Be concise and professional.
`;

export const llmService = {
    async sendMessage(messages: Message[], context: string, settings: AppSettings, images?: string[]): Promise<string> {
        const { selectedModel, geminiKey, systemPrompt } = settings;

        if (!geminiKey) throw new Error(`Please provide a Gemini API Key in Settings.`);

        const promptTemplate = systemPrompt !== undefined ? systemPrompt : DEFAULT_SYSTEM_PROMPT;

        // 이메일 컨텍스트는 system prompt에 포함 (마지막 user 메시지가 아님)
        const systemWithContext = context.trim()
            ? promptTemplate.trim() + `\n\nCurrent Email Context:\n${context}`
            : promptTemplate.trim();

        // UI의 system(에러/환영) 메시지는 제거하고 user/assistant 대화만 전달
        const chatHistory = messages
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .map(m => ({ role: m.role, content: m.content }));

        const hasImages = images && images.length > 0;

        // Gemini Adapter (flash or pro)
        if (selectedModel.startsWith('gemini')) {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${geminiKey}`;
            const geminiContents = chatHistory
                .slice(chatHistory.findIndex(m => m.role === 'user'))
                .map((m, idx, arr) => {
                    const isLastUser = idx === arr.length - 1 && m.role === 'user';
                    const parts: object[] = [{ text: m.content }];
                    if (isLastUser && hasImages) {
                        images!.forEach(img => {
                            const [header, b64] = img.split(',');
                            const mimeType = header.replace('data:', '').replace(';base64', '');
                            parts.push({ inline_data: { mime_type: mimeType, data: b64 } });
                        });
                    }
                    return { role: m.role === 'assistant' ? 'model' : 'user', parts };
                });
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    system_instruction: { parts: [{ text: systemWithContext }] },
                    contents: geminiContents
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || `Gemini API error: ${response.status}`);
            if (data.promptFeedback?.blockReason) throw new Error(`Gemini blocked: ${data.promptFeedback.blockReason}`);
            const geminiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!geminiText) {
                const reason = data.candidates?.[0]?.finishReason || 'no candidates';
                throw new Error(`No response from Gemini (reason: ${reason})`);
            }
            return geminiText;
        }

        return "Error: Invalid Model Selected";
    }
};
