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

        const fullContext = `Current Email Content / Context:\n${context}\n\nUser Question:`;

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
                        { role: 'system', content: SYSTEM_PROMPT },
                        ...messages.map(m => ({ role: m.role, content: m.content })),
                        { role: 'user', content: fullContext }
                    ]
                })
            });
            const data = await response.json();
            return data.choices[0]?.message?.content || "Error: No response from OpenAI.";
        }

        // 2. Gemini Adapter
        if (selectedModel === 'gemini') {
            // Simple shim for Gemini API (Messages API)
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${modelKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: `${SYSTEM_PROMPT}\n\n${fullContext}` }]
                    }]
                })
            });
            const data = await response.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text || "Error: No response from Gemini.";
        }

        // 3. Claude Adapter
        if (selectedModel === 'claude') {
            // Claude typically requires a proxy due to CORS in browser add-ins, but we'll implement the direct call structure.
            // Warning: Direct Anthropic API calls might fail due to CORS from 'localhost' or 'outlook domain'.
            // For this MVP, we implement standard fetch.
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'x-api-key': modelKey,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json',
                    'dangerously-allow-browser-only': 'true' // Required for client-side
                },
                body: JSON.stringify({
                    model: 'claude-3-opus-20240229',
                    max_tokens: 1024,
                    system: SYSTEM_PROMPT,
                    messages: [
                        ...messages.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
                        { role: 'user', content: fullContext }
                    ]
                })
            });
            const data = await response.json();
            return data.content?.[0]?.text || "Error: No response from Claude.";
        }

        return "Error: Invalid Model Selected";
    }
};
