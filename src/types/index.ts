import type { SearchEmailResult } from '../services/outlookService';

export type Role = 'user' | 'assistant' | 'system' | 'search-results';

export interface Message {
    id: string;
    role: Role;
    content: string;
    timestamp: number;
    searchResults?: SearchEmailResult[];
}

export type LLMProvider = 'gemini-2.5-flash' | 'gemini-2.5-pro';

export interface AppSettings {
    geminiKey: string;
    selectedModel: LLMProvider;
    systemPrompt?: string;
}

export type AppMode = 'current' | 'search';
