import { useState } from 'react';
import { Settings, AlertCircle } from 'lucide-react';
import { ChatInterface } from './components/ChatInterface';
import { SettingsPanel } from './components/SettingsPanel';
import { SearchFilter } from './components/SearchFilter';
import type { AppSettings, AppMode } from './types';

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [appMode, setAppMode] = useState<AppMode>('current');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Initialize Settings from LocalStorage
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('redink-outlook-settings');
    return saved ? JSON.parse(saved) : {
      openaiKey: '',
      geminiKey: '',
      claudeKey: '',
      selectedModel: 'openai'
    };
  });

  const saveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('redink-outlook-settings', JSON.stringify(newSettings));
    setShowSettings(false);
  };

  const clearSettings = () => {
    localStorage.removeItem('redink-outlook-settings');
    setSettings({ openaiKey: '', geminiKey: '', claudeKey: '', selectedModel: 'openai' });
    setError(null);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 relative overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shadow-sm z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
            AI
          </div>
          <h1 className="font-semibold text-slate-800 text-sm">Outlook Assistant</h1>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
          title="Settings"
        >
          <Settings size={18} />
        </button>
      </header>

      {/* Controls (Search Mode) */}
      <SearchFilter
        mode={appMode}
        searchKeyword={searchKeyword}
        onModeChange={setAppMode}
        onKeywordChange={setSearchKeyword}
      />

      {/* Main Chat Area */}
      <div className="flex-1 overflow-hidden relative">
        <ChatInterface
          settings={settings}
          mode={appMode}
          searchKeyword={searchKeyword}
        />
      </div>

      {/* Error Toast */}
      {error && (
        <div className="absolute top-16 left-4 right-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg text-sm flex items-start gap-2 animate-in slide-in-from-top-2 z-40">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <p className="flex-1">{error}</p>
          <button onClick={() => setError(null)} className="font-bold hover:opacity-75">×</button>
        </div>
      )}

      {/* Settings Overlay */}
      {showSettings && (
        <SettingsPanel
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          settings={settings}
          onSave={saveSettings}
          onClear={clearSettings}
        />
      )}
    </div>
  );
}

export default App;
