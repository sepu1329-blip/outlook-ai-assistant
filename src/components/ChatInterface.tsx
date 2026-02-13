import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, Trash2, Reply } from 'lucide-react';
import { outlookService } from '../services/outlookService';
import { llmService } from '../services/llmService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { AppSettings, AppMode } from '../types';

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
}

interface ChatInterfaceProps {
    settings: AppSettings;
    mode: AppMode;
    searchKeyword: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ settings, mode, searchKeyword }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Initial Welcome
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([{
                id: 'welcome',
                role: 'assistant',
                content: `Hello! I'm your AI Outlook Assistant (v1.1.0 - Hybrid Mode). \n\nI can help you summarize emails, draft replies, or find information. \n\nPlease configure your API keys in Settings first.`,
                timestamp: Date.now()
            }]);
        }
    }, []);

    const handleClearChat = () => {
        setMessages([{
            id: Date.now().toString(),
            role: 'assistant',
            content: `Chat cleared. How can I help you?`,
            timestamp: Date.now()
        }]);
    };

    const handleReplyDraft = (content: string) => {
        try {
            outlookService.createReplyDraft(content);
        } catch (err: any) {
            setError("Failed to create reply: " + err.message);
        }
    };

    const handleSendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: Date.now()
        };

        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);
        setError(null);

        try {
            // 1. Get Context based on Mode
            let context = "";

            if (mode === 'current') {
                // Try to get current email
                try {
                    const email = await outlookService.getCurrentEmail();
                    context += `Current Email:\nSubject: ${email.subject}\nFrom: ${email.sender} <${email.from}>\nBody: ${email.body}\n\n`;
                } catch (e) {
                    console.log("No email context available:", e);
                }
            } else if (mode === 'search') {
                if (!searchKeyword.trim()) {
                    throw new Error("Please enter a keyword in Search Mode.");
                }
                try {
                    // In search mode, we fetch relevant emails based on the keyword
                    const results = await outlookService.searchEmails(searchKeyword);
                    context += `Found ${results.length} emails matching "${searchKeyword}":\n\n${results.join("\n")}\n\n`;
                } catch (e) {
                    context += `Search failed: ${e}\n\n`;
                }
            }

            // 2. Call LLM
            const response = await llmService.sendMessage(newMessages, context, settings);

            // 3. Add AI Response
            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response,
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, assistantMessage]);

        } catch (err: any) {
            console.error(err);
            const errorMessage = typeof err === 'string' ? err : err.message || "An unexpected error occurred.";
            setError(errorMessage);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'system',
                content: `Error: ${errorMessage}`,
                timestamp: Date.now()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b px-4 py-3 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    <h1 className="font-semibold text-gray-800">AI Assistant</h1>
                </div>
                <button onClick={handleClearChat} className="p-1 hover:bg-gray-100 rounded text-gray-500" title="Clear Chat">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[85%] rounded-lg p-3 shadow-sm ${msg.role === 'user'
                                ? 'bg-blue-600 text-white'
                                : msg.role === 'system'
                                    ? 'bg-red-50 text-red-600 border border-red-100'
                                    : 'bg-white border border-gray-200 text-gray-800'
                                }`}
                        >
                            <div className="prose prose-sm max-w-none dark:prose-invert">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {msg.content}
                                </ReactMarkdown>
                            </div>

                            {/* Reply Button for Assistant Messages containing draft-like text */}
                            {msg.role === 'assistant' && (
                                <div className="mt-2 flex justify-end">
                                    <button
                                        onClick={() => handleReplyDraft(msg.content)}
                                        className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 font-medium"
                                    >
                                        <Reply className="w-3 h-3" />
                                        Reply with this
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                            <span className="text-sm text-gray-500">AI is thinking...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t">
                {error && (
                    <div className="mb-2 text-xs text-red-500 px-2">
                        {error}
                    </div>
                )}
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Ask me to summarize or draft..."
                        className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={isLoading || !input.trim()}
                        className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};
