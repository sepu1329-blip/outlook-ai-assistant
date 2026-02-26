import React from 'react';
import { Search, Mail } from 'lucide-react';
import type { AppMode } from '../types';
import { cn } from '../lib/utils';

interface SearchFilterProps {
    mode: AppMode;
    searchKeyword: string;
    onModeChange: (mode: AppMode) => void;
    onKeywordChange: (keyword: string) => void;
}

export const SearchFilter: React.FC<SearchFilterProps> = ({ mode, searchKeyword, onModeChange, onKeywordChange }) => {
    return (
        <div className="flex flex-col p-3 bg-white border-b border-slate-200 gap-3">
            <div className="flex justify-between items-center">
                {/* Mode Switcher */}
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">🎯 모드:</span>
                    <div className="flex p-0.5 bg-slate-50 rounded-md">
                        <button
                            onClick={() => onModeChange('current')}
                            className={cn(
                                "flex items-center justify-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded transition-all",
                                mode === 'current' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700 bg-transparent"
                            )}
                        >
                            <Mail size={12} />
                            메일
                        </button>
                        <button
                            onClick={() => onModeChange('search')}
                            className={cn(
                                "flex items-center justify-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded transition-all",
                                mode === 'search' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700 bg-transparent"
                            )}
                        >
                            <Search size={12} />
                            검색
                        </button>
                    </div>
                </div>

                {/* Additional context or buttons could go here on the right, mimicking Excel's layout */}
            </div>

            {/* Search Input (Only visible in search mode) */}
            {mode === 'search' && (
                <div className="relative animate-in fade-in slide-in-from-top-2 duration-200">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                        type="text"
                        value={searchKeyword}
                        onChange={(e) => onKeywordChange(e.target.value)}
                        placeholder="검색어 입력..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:border-indigo-600 focus:outline-none transition-colors"
                    />
                </div>
            )}

            {mode === 'search' && !searchKeyword && (
                <p className="text-[10px] text-orange-600 pl-1 mt-0">
                    * 검색어를 입력해주세요
                </p>
            )}
        </div>
    );
};
