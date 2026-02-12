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
        <div className="flex flex-col gap-2 p-3 bg-white border-b border-slate-200">
            {/* Mode Switcher */}
            <div className="flex p-1 bg-slate-100 rounded-lg">
                <button
                    onClick={() => onModeChange('current')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all",
                        mode === 'current' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                >
                    <Mail size={14} />
                    Current Email
                </button>
                <button
                    onClick={() => onModeChange('search')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all",
                        mode === 'search' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                >
                    <Search size={14} />
                    Search Mode
                </button>
            </div>

            {/* Search Input (Only visible in search mode) */}
            {mode === 'search' && (
                <div className="relative animate-in fade-in slide-in-from-top-2 duration-200">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                        type="text"
                        value={searchKeyword}
                        onChange={(e) => onKeywordChange(e.target.value)}
                        placeholder="Enter keyword or sender name..."
                        className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                </div>
            )}

            {mode === 'search' && !searchKeyword && (
                <p className="text-[10px] text-orange-600 pl-1">
                    * Keyword required for search mode
                </p>
            )}
        </div>
    );
};
