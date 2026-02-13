import { useState, useEffect } from 'react';
import { Settings, AlertCircle } from 'lucide-react';
import { ChatInterface } from './components/ChatInterface';
import { SettingsPanel } from './components/SettingsPanel';
import { SearchFilter } from './components/SearchFilter';
import { outlookService } from './services/outlookService';
import { llmService } from './services/llmService';
import type { AppMode, AppSettings, Message } from './types';

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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
    setMessages([]);
    setError(null);
  };

  const handleSendMessage = async (content: string) => {
    try {
      setError(null);
      setIsLoading(true);

      // Add User Message
      const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        content,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, userMsg]);

      // 1. Get Context
      let context = "";
      if (appMode === 'current') {
        const item = await outlookService.getCurrentEmail();
        context = `Subject: ${item.subject}\nFrom: ${item.sender} (${item.from})\n\nBody:\n${item.body}`;
      } else {
        if (!searchKeyword.trim()) {
          throw new Error("Search keyword is required in Search Mode.");
        }
        const emails = await outlookService.searchEmails(searchKeyword);
        context = `Found ${emails.length} emails matching "${searchKeyword}":\n\n${emails.join('\n\n')}`;
      }

      // 2. Call LLM
      const reply = await llmService.sendMessage([...messages, userMsg], context, settings);

      // Add Assistant Message
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reply,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, assistantMsg]);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred.");
      // Add error message to chat
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'system',
        content: `Error: ${err.message}`,
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial Welcome
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `Hello! I'm your AI Outlook Assistant (v1.0.1). \n\nI can help you summarize emails, draft replies, or find information. \n\nPlease configure your API keys in Settings first.`,
        timestamp: Date.now()
      }]);
    }
  }, []);

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

      {/* Controls */}
      <SearchFilter
        mode={appMode}
        searchKeyword={searchKeyword}
        onModeChange={setAppMode}
        onKeywordChange={setSearchKeyword}
      />

      {/* Main Chat Area */}
      <div className="flex-1 overflow-hidden relative">
        <ChatInterface
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
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
