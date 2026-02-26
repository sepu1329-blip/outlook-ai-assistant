import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Trash2, Reply, Mail } from 'lucide-react';
import { outlookService } from '../services/outlookService';
import type { SearchEmailResult } from '../services/outlookService';
import { llmService } from '../services/llmService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { AppSettings, AppMode } from '../types';

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system' | 'search-results';
    content: string;
    timestamp: number;
    searchResults?: SearchEmailResult[];
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
                content: `안녕하세요! AI Outlook 어시스턴트입니다. \n\n이메일 요약, 답장 초안 작성 및 정보 검색을 도와드릴 수 있습니다. \n\n시작하기 전에 '설정'에서 API 키를 입력해주세요.`,
                timestamp: Date.now()
            }]);
        }
    }, []);

    const handleClearChat = () => {
        setMessages([{
            id: Date.now().toString(),
            role: 'assistant',
            content: `대화가 초기화되었습니다. 무엇을 도와드릴까요?`,
            timestamp: Date.now()
        }]);
    };

    const handleReplyDraft = (content: string) => {
        try {
            outlookService.createReplyDraft(content);
        } catch (err: any) {
            setError("답장 초안 생성 실패: " + err.message);
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
            let emailImages: string[] = [];

            if (mode === 'current') {
                // Try to get current email (including inline images)
                try {
                    const email = await outlookService.getCurrentEmail();
                    context += `현재 이메일:\n제목: ${email.subject}\n보낸 사람: ${email.sender} <${email.from}>\n내용: ${email.body}\n\n`;
                    emailImages = email.images || [];
                } catch (e) {
                    console.log("No email context available:", e);
                }
            } else if (mode === 'search') {
                if (!searchKeyword.trim()) {
                    throw new Error("검색 모드에서는 검색어를 입력해주세요.");
                }
                try {
                    // In search mode, we fetch relevant emails based on the keyword
                    const results = await outlookService.searchEmails(searchKeyword);

                    // Show clickable email cards in chat
                    const searchMsg: Message = {
                        id: (Date.now() + 0.1).toString(),
                        role: 'search-results',
                        content: `"${searchKeyword}"와 일치하는 이메일 ${results.length}개를 찾았습니다.`,
                        timestamp: Date.now(),
                        searchResults: results,
                    };
                    setMessages(prev => [...prev, searchMsg]);

                    // Build LLM context with numbered emails
                    context += `"${searchKeyword}"와 일치하는 이메일 ${results.length}개를 찾았습니다:\n\n`;
                    context += results.map((r, i) =>
                        `이메일 #${i + 1}: [${r.receivedTime}] 보낸 사람: ${r.sender} | 제목: ${r.subject}\n${r.preview}`
                    ).join('\n\n');
                    context += '\n\n';
                } catch (e) {
                    throw new Error(`검색 실패: ${String(e)}`);
                }
            }

            // 2. Call LLM (exclude search-results UI-only messages)
            const llmMessages = newMessages.filter(m => m.role !== 'search-results') as import('../types').Message[];
            const response = await llmService.sendMessage(llmMessages, context, settings, emailImages.length > 0 ? emailImages : undefined);

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
            const errorMessage = typeof err === 'string' ? err : err.message || "알 수 없는 오류가 발생했습니다.";
            setError(errorMessage);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'system',
                content: `오류: ${errorMessage}`,
                timestamp: Date.now()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="bg-white border-b border-slate-100 px-5 py-2.5 flex justify-between items-center hidden">
                {/* Hid the inner header since App.tsx has one now, to match Excel style strictly. But if needed, just hiding it structure-wise is fine */}
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    <h1 className="font-semibold text-slate-800">AI Assistant</h1>
                </div>
                <button onClick={handleClearChat} className="p-1.5 hover:bg-slate-50 rounded-md text-slate-500 transition-all" title="Clear Chat">
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
                        {msg.role === 'search-results' ? (
                            <div className="max-w-[92%] rounded-xl px-3 py-2.5 bg-blue-50 border border-blue-100 text-sm">
                                <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1">
                                    <Mail className="w-3.5 h-3.5" />
                                    {msg.content}
                                </p>
                                <div className="flex flex-col gap-1">
                                    {msg.searchResults?.map((result) => (
                                        <button
                                            key={result.entryId || result.subject}
                                            onClick={() => outlookService.openEmail(result.entryId)}
                                            className="w-full text-left px-2.5 py-2 rounded-lg bg-white hover:bg-blue-100 border border-blue-100 cursor-pointer group transition-colors"
                                        >
                                            <p className="text-xs font-medium text-gray-800 truncate group-hover:text-blue-700 leading-snug">{result.subject}</p>
                                            <p className="text-[10px] text-gray-500 mt-0.5">{result.sender}{result.receivedTime ? ` · ${result.receivedTime}` : ''}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div
                                className={`max-w-[85%] ${msg.role === 'user'
                                    ? 'rounded-2xl rounded-br-sm px-4 py-3 bg-[#4f46e5] text-white text-sm'
                                    : msg.role === 'system'
                                        ? 'rounded-xl px-3 py-2 bg-red-50 text-red-700 border border-red-200 text-xs'
                                        : 'rounded-2xl rounded-bl-sm px-4 py-3 bg-[#f1f5f9] text-slate-800 text-sm'
                                    }`}
                            >
                                <div className="markdown-content">
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
                                            이 내용으로 답장하기
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="rounded-2xl rounded-bl-sm px-4 py-3 bg-[#f1f5f9]">
                            <div className="gemini-dots">
                                <div className="gemini-dot !bg-[#64748b] !bg-none" />
                                <div className="gemini-dot !bg-[#64748b] !bg-none" />
                                <div className="gemini-dot !bg-[#64748b] !bg-none" />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-200 flex flex-col">
                {error && (
                    <div className="mb-2 text-xs text-red-500 px-1">{error}</div>
                )}

                <div className="flex absolute top-[138px] right-2 z-10">
                    <button onClick={handleClearChat} className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-md text-slate-500 shadow-sm transition-all" title="대화 초기화">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex items-end gap-3">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                        placeholder="여기에 요청사항을 입력하세요..."
                        rows={2}
                        className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-[10px] text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition-colors resize-none"
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={isLoading || !input.trim()}
                        className="w-11 h-11 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105 disabled:bg-slate-400 disabled:hover:scale-100 disabled:cursor-not-allowed transition-all flex items-center justify-center flex-shrink-0"
                    >
                        <Send className="w-5 h-5 -ml-0.5" />
                    </button>
                </div>
            </div>
        </div>
    );
};
