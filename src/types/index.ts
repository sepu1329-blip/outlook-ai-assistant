export type Role = 'user' | 'assistant' | 'system';

export interface Message {
    id: string;
    role: Role;
    content: string;
    timestamp: number;
}

export type LLMProvider = 'openai' | 'gemini' | 'claude';

export interface AppSettings {
    openaiKey: string;
    geminiKey: string;
    claudeKey: string;
    selectedModel: LLMProvider;
}

export type AppMode = 'current' | 'search';
