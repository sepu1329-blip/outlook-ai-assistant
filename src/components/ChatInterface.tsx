import React, { useState, useRef, useEffect } from 'react';
import { Send, Reply, Mail, Copy, Check } from 'lucide-react';
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
    searchSender: string;
    searchKeyword: string;
    clearChatTrigger?: number;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ settings, mode, searchSender, searchKeyword, clearChatTrigger }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleCopyToClipboard = async (messageId: string) => {
        try {
            const sourceElement = document.getElementById(`msg-content-${messageId}`);
            if (!sourceElement) return;

            const clone = sourceElement.cloneNode(true) as HTMLElement;

            // Inline computed styles to keep the design intact in Outlook
            const propsToInline = [
                'color', 'background-color', 'font-family', 'font-size', 'font-weight',
                'font-style', 'text-decoration', 'border-top', 'border-right', 'border-bottom',
                'border-left', 'padding', 'margin', 'line-height', 'text-align', 'border-collapse'
            ];

            const applyStyles = (src: Element, tgt: HTMLElement) => {
                const computed = window.getComputedStyle(src);
                propsToInline.forEach(prop => {
                    const val = computed.getPropertyValue(prop);
                    if (val && val !== 'rgba(0, 0, 0, 0)' && val !== 'transparent' && val !== 'none') {
                        tgt.style.setProperty(prop, val);
                    }
                });

                if (tgt.tagName === 'TABLE') {
                    tgt.setAttribute('border', '1');
                    tgt.setAttribute('cellspacing', '0');
                    tgt.setAttribute('cellpadding', '8');
                    tgt.style.borderCollapse = 'collapse';
                }

                Array.from(src.children).forEach((child, i) => {
                    applyStyles(child, tgt.children[i] as HTMLElement);
                });
            };

            applyStyles(sourceElement, clone);

            const html = clone.outerHTML;
            const text = sourceElement.innerText;

            const clipboardItem = new ClipboardItem({
                'text/html': new Blob([html], { type: 'text/html' }),
                'text/plain': new Blob([text], { type: 'text/plain' })
            });

            await navigator.clipboard.write([clipboardItem]);
            setCopiedId(messageId);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
            // Fallback
            try {
                const sourceElement = document.getElementById(`msg-content-${messageId}`);
                if (sourceElement) {
                    await navigator.clipboard.writeText(sourceElement.innerText);
                    setCopiedId(messageId);
                    setTimeout(() => setCopiedId(null), 2000);
                }
            } catch (fallbackErr) {
                console.error('Fallback copy failed:', fallbackErr);
            }
        }
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

    // Listen to clearChatTrigger from App.tsx
    useEffect(() => {
        if (clearChatTrigger && clearChatTrigger > 0) {
            handleClearChat();
        }
    }, [clearChatTrigger]);

    const handleReplyDraft = async (content: string) => {
        try {
            await outlookService.createReplyDraft(content);
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

            let searchResultsContext: import('../services/outlookService').SearchEmailResult[] = [];

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
                if (!searchSender.trim() && !searchKeyword.trim()) {
                    throw new Error("검색 모드에서는 보낸 사람 또는 검색어를 하나 이상 입력해주세요.");
                }
                try {
                    // In search mode, we fetch relevant emails based on the keyword/sender
                    const results = await outlookService.searchEmails(searchSender, searchKeyword);
                    searchResultsContext = results;

                    // Build LLM context with numbered emails
                    context += `다음은 사용자가 "${searchSender ? `보낸 사람: ${searchSender}` : ''} ${searchKeyword ? `검색어: ${searchKeyword}` : ''}" 조건으로 검색한 상위 ${results.length}개의 이메일 내역입니다.\n`;
                    context += `지침: 답변을 작성할 때 반드시 이메일을 참고하고, 참고한 내용의 끝에는 항상 [Email #번호] 형식으로 출처를 표기하세요.\n\n`;
                    context += results.map((r, i) =>
                        `[Email #${i + 1}]:\n보낸 사람: ${r.sender}\n수신 시간: ${r.receivedTime}\n제목: ${r.subject}\n미리보기: ${r.preview}`
                    ).join('\n\n');
                    context += '\n\n';
                } catch (e) {
                    throw new Error(`검색 실패: ${String(e)}`);
                }
            }

            // 2. Call LLM (exclude search-results UI-only messages)
            const llmMessages = newMessages.filter(m => m.role !== 'search-results') as import('../types').Message[];
            const response = await llmService.sendMessage(llmMessages, context, settings, emailImages.length > 0 ? emailImages : undefined);

            // 3. Parse LLM citations and filter the search results
            let filteredResults: typeof searchResultsContext = [];
            if (mode === 'search' && searchResultsContext.length > 0) {
                // Find all matches of [Email X] or [Email #X] or [Email: X] formatting
                const regex = /\[Email\s*#?:?\s*(\d+)\]/gi;
                let match;
                const citedIndices = new Set<number>();
                while ((match = regex.exec(response)) !== null) {
                    const idx = parseInt(match[1], 10) - 1;
                    if (!isNaN(idx) && idx >= 0 && idx < searchResultsContext.length) {
                        citedIndices.add(idx);
                    }
                }
                // Only keep exactly the emails the LLM explicitly cited
                filteredResults = searchResultsContext.filter((_, idx) => citedIndices.has(idx));
            }

            // 4. Add AI Response
            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response,
                timestamp: Date.now(),
                searchResults: filteredResults.length > 0 ? filteredResults : undefined
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
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        {msg.role === 'search-results' ? null : (
                            <div
                                className={`max-w-[85%] ${msg.role === 'user'
                                    ? 'rounded-2xl rounded-br-sm px-4 py-3 bg-[#4f46e5] text-white text-sm'
                                    : msg.role === 'system'
                                        ? 'rounded-xl px-3 py-2 bg-red-50 text-red-700 border border-red-200 text-xs'
                                        : 'rounded-2xl rounded-bl-sm px-4 py-3 bg-[#f1f5f9] text-slate-800 text-sm'
                                    }`}
                            >
                                <div id={`msg-content-${msg.id}`} className="markdown-content">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {msg.content}
                                    </ReactMarkdown>
                                </div>

                                {/* Inline Cited Search Results under Assistant Message */}
                                {msg.role === 'assistant' && msg.searchResults && msg.searchResults.length > 0 && (
                                    <div className="mt-3 bg-white/60 rounded-xl p-2.5 border border-slate-200 shadow-sm">
                                        <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1">
                                            <Mail className="w-3.5 h-3.5 text-slate-500" />
                                            답변에 참조된 이메일
                                        </p>
                                        <div className="flex flex-col gap-1.5">
                                            {msg.searchResults.map((result) => (
                                                <button
                                                    key={result.entryId || result.subject}
                                                    onClick={() => outlookService.openEmail(result.entryId)}
                                                    className="w-full text-left px-2.5 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 cursor-pointer group transition-colors shadow-sm"
                                                >
                                                    <p className="text-xs font-medium text-slate-800 truncate group-hover:text-indigo-600 leading-snug">{result.subject}</p>
                                                    <p className="text-[10px] text-slate-500 mt-0.5">{result.sender}{result.receivedTime ? ` · ${result.receivedTime}` : ''}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons for Assistant Messages */}
                                {msg.role === 'assistant' && (
                                    <div className="mt-3 flex justify-end gap-3">
                                        <button
                                            onClick={() => handleCopyToClipboard(msg.id)}
                                            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 font-medium transition-colors"
                                        >
                                            {copiedId === msg.id ? (
                                                <>
                                                    <Check className="w-3.5 h-3.5 text-green-600" />
                                                    <span className="text-green-600">복사됨</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="w-3.5 h-3.5" />
                                                    <span>복사</span>
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleReplyDraft(msg.content)}
                                            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                                        >
                                            <Reply className="w-3.5 h-3.5" />
                                            <span>답장하기</span>
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
