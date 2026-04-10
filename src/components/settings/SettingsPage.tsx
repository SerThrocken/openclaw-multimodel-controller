import React from 'react';
import { useStore } from '../../store';
import { Moon, Sun, Monitor, Info } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, providers, conversations } = useStore();

  const stats = {
    providers: providers.length,
    enabled: providers.filter((p) => p.enabled).length,
    conversations: conversations.length,
    messages: conversations.reduce((acc, c) => acc + c.messages.length, 0),
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-700 bg-slate-900">
        <h1 className="text-xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 text-sm mt-0.5">Customize your Openclaw experience</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 max-w-2xl">
        {/* Appearance */}
        <section>
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">Appearance</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-white mb-2">Theme</label>
              <div className="flex gap-2">
                {(['dark', 'light', 'system'] as const).map((theme) => {
                  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
                  return (
                    <button
                      key={theme}
                      onClick={() => updateSettings({ theme })}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition-colors capitalize ${
                        settings.theme === theme
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500 hover:text-white'
                      }`}
                    >
                      <Icon size={14} /> {theme}
                    </button>
                  );
                })}
              </div>
              <p className="text-slate-500 text-xs mt-1">
                Note: Full light/system theme requires restart. App currently uses dark theme.
              </p>
            </div>

            <div>
              <label className="block text-sm text-white mb-2">Font Size</label>
              <div className="flex gap-2">
                {(['sm', 'md', 'lg'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => updateSettings({ fontSize: size })}
                    className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                      settings.fontSize === size
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500 hover:text-white'
                    }`}
                  >
                    {size === 'sm' ? 'Small' : size === 'md' ? 'Medium' : 'Large'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Chat */}
        <section>
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">Chat</h2>

          <div className="space-y-3">
            <ToggleSetting
              label="Send on Enter"
              description="Press Enter to send messages (Shift+Enter for new line)"
              checked={settings.sendOnEnter}
              onChange={(v) => updateSettings({ sendOnEnter: v })}
            />
            <ToggleSetting
              label="Show Timestamps"
              description="Display message timestamps in conversations"
              checked={settings.showTimestamps}
              onChange={(v) => updateSettings({ showTimestamps: v })}
            />
          </div>
        </section>

        {/* Stats */}
        <section>
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">Statistics</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Connections', value: stats.providers },
              { label: 'Active', value: stats.enabled },
              { label: 'Chats', value: stats.conversations },
              { label: 'Messages', value: stats.messages },
            ].map((stat) => (
              <div key={stat.label} className="bg-slate-800 rounded-xl p-4 text-center border border-slate-700">
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-slate-400 text-xs mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* About */}
        <section>
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">About</h2>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex gap-3">
            <Info size={20} className="text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-medium text-sm">Openclaw MultiModel Controller</p>
              <p className="text-slate-400 text-xs mt-1">Version 1.0.0</p>
              <p className="text-slate-400 text-xs mt-2">
                A cross-platform AI chat controller supporting multiple AI providers including
                OpenAI, Claude, Gemini, Perplexity, Ollama, and more.
                Available as Android APK and Desktop (PC/Mac/Linux) application.
              </p>
              <div className="flex gap-3 mt-3">
                <a
                  href="https://github.com/tlcrockett5099-cmyk/openclaw-multimodel-controller"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-xs transition-colors"
                >
                  GitHub Repository →
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

const ToggleSetting: React.FC<{
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}> = ({ label, description, checked, onChange }) => (
  <div className="flex items-center justify-between bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
    <div>
      <div className="text-sm text-white font-medium">{label}</div>
      {description && <div className="text-xs text-slate-400 mt-0.5">{description}</div>}
    </div>
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${
        checked ? 'bg-blue-600' : 'bg-slate-600'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);
