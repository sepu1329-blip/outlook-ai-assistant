import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Trash2 } from 'lucide-react';
import type { AppSettings, LLMProvider } from '../types';

interface SettingsPanelProps {
    settings: AppSettings;
    onSave: (settings: AppSettings) => void;
    onClear: () => void;
    isOpen: boolean;
    onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onSave, onClear, isOpen, onClose }) => {
    const [localSettings, setLocalSettings] = useState<AppSettings>(settings);

    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    if (!isOpen) return null;

    const handleChange = (field: keyof AppSettings, value: string) => {
        setLocalSettings(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="absolute inset-0 bg-white z-50 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
                <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                    <SettingsIcon size={18} />
                    설정
                </h2>
                <button onClick={onClose} className="text-slate-500 hover:text-slate-700">닫기</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Model Selection */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">모델 선택</label>
                    <select
                        value={localSettings.selectedModel}
                        onChange={(e) => handleChange('selectedModel', e.target.value as LLMProvider)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                        <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                        <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                    </select>
                </div>

                {/* API Keys */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700">Gemini API 키</label>
                        <input
                            type="password"
                            value={localSettings.geminiKey}
                            onChange={(e) => handleChange('geminiKey', e.target.value)}
                            placeholder="AIza..."
                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                    </div>
                </div>

                {/* System Prompt Customization */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">시스템 프롬프트 (System Prompt)</label>
                    <textarea
                        value={localSettings.systemPrompt || ''}
                        onChange={(e) => handleChange('systemPrompt', e.target.value)}
                        placeholder="기본 시스템 프롬프트를 입력하세요..."
                        rows={8}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-xs"
                    />
                    <p className="text-xs text-slate-500 mt-1 leading-snug">
                        기본 설정된 AI의 행동 지침입니다. 자유롭게 수정하여 원하는 방식으로 AI를 세팅해보세요!
                    </p>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
                <button
                    onClick={() => onSave(localSettings)}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                    <Save size={16} />
                    설정 저장
                </button>

                <button
                    onClick={onClear}
                    className="w-full flex items-center justify-center gap-2 text-red-600 border border-red-200 bg-red-50 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                >
                    <Trash2 size={16} />
                    모든 데이터 삭제
                </button>
            </div>
        </div>
    );
};
