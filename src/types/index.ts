import type { SearchEmailResult } from '../services/outlookService';

export type Role = 'user' | 'assistant' | 'system' | 'search-results';

export interface Message {
    id: string;
    role: Role;
    content: string;
    timestamp: number;
    searchResults?: SearchEmailResult[];
}

export type LLMProvider = 'openai' | 'gemini' | 'claude';

export interface AppSettings {
    openaiKey: string;
    geminiKey: string;
    claudeKey: string;
    selectedModel: LLMProvider;
}

export type AppMode = 'current' | 'search';
