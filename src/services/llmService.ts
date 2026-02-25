import type { AppSettings, Message } from "../types";

const SYSTEM_PROMPT = `You are a helpful AI assistant for Outlook.
- Output tables in Markdown format when summarizing data.
- If asked to draft a reply, detect the sender's gender from their name if possible. 
  - If male, start with "Dear Mr. [Last Name]".
  - If female, start with "Dear Ms. [Last Name]".
  - If unsure, use "Dear [Full Name]".
- Be concise and professional.
`;

export const llmService = {
    async sendMessage(messages: Message[], context: string, settings: AppSettings): Promise<string> {
        const { selectedModel, openaiKey, geminiKey, claudeKey } = settings;
        const modelKey = selectedModel === 'openai' ? openaiKey : selectedModel === 'gemini' ? geminiKey : claudeKey;

        if (!modelKey) throw new Error(`Please provide an API Key for ${selectedModel.toUpperCase()} in Settings.`);

        // 이메일 컨텍스트는 system prompt에 포함 (마지막 user 메시지가 아님)
        const systemWithContext = context.trim()
            ? SYSTEM_PROMPT.trim() + `\n\nCurrent Email Context:\n${context}`
            : SYSTEM_PROMPT.trim();

        // UI의 system(에러/환영) 메시지는 제거하고 user/assistant 대화만 전달
        const chatHistory = messages
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .map(m => ({ role: m.role, content: m.content }));

        // 1. OpenAI Adapter
        if (selectedModel === 'openai') {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${modelKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [
                        { role: 'system', content: systemWithContext },
                        ...chatHistory
                    ]
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || `OpenAI API error: ${response.status}`);
            return data.choices[0]?.message?.content || "Error: No response from OpenAI.";
        }

        // 2. Gemini Adapter
        if (selectedModel === 'gemini') {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${modelKey}`;
            // Gemini는 user/model 교대 포맷 + 첫 메시지는 반드시 user
            const geminiContents = chatHistory
                .slice(chatHistory.findIndex(m => m.role === 'user'))
                .map(m => ({
                    role: m.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: m.content }]
                }));
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

        // 3. Claude Adapter
        if (selectedModel === 'claude') {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'x-api-key': modelKey,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json',
                    'dangerously-allow-browser-only': 'true'
                },
                body: JSON.stringify({
                    model: 'claude-3-opus-20240229',
                    max_tokens: 1024,
                    system: systemWithContext,
                    messages: chatHistory
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || `Claude API error: ${response.status}`);
            return data.content?.[0]?.text || "Error: No response from Claude.";
        }

        return "Error: Invalid Model Selected";
    }
};
