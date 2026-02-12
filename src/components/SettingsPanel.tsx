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
                    Settings
                </h2>
                <button onClick={onClose} className="text-slate-500 hover:text-slate-700">Done</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Model Selection */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Default Model</label>
                    <select
                        value={localSettings.selectedModel}
                        onChange={(e) => handleChange('selectedModel', e.target.value as LLMProvider)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                        <option value="openai">OpenAI (GPT-4o)</option>
                        <option value="gemini">Google Gemini</option>
                        <option value="claude">Anthropic Claude</option>
                    </select>
                </div>

                {/* API Keys */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700">OpenAI API Key</label>
                        <input
                            type="password"
                            value={localSettings.openaiKey}
                            onChange={(e) => handleChange('openaiKey', e.target.value)}
                            placeholder="sk-..."
                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700">Gemini API Key</label>
                        <input
                            type="password"
                            value={localSettings.geminiKey}
                            onChange={(e) => handleChange('geminiKey', e.target.value)}
                            placeholder="AIza..."
                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700">Claude API Key</label>
                        <input
                            type="password"
                            value={localSettings.claudeKey}
                            onChange={(e) => handleChange('claudeKey', e.target.value)}
                            placeholder="sk-ant..."
                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
                <button
                    onClick={() => onSave(localSettings)}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                    <Save size={16} />
                    Save Settings
                </button>

                <button
                    onClick={onClear}
                    className="w-full flex items-center justify-center gap-2 text-red-600 border border-red-200 bg-red-50 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                >
                    <Trash2 size={16} />
                    Clear All Data
                </button>
            </div>
        </div>
    );
};
