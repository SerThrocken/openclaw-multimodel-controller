import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { Info, Trash2, Plus, Lock, Brain, Sparkles } from 'lucide-react';
import { PATREON_URL } from '../../constants';
import { useToast } from '../../context/ToastContext';
import { startPatreonOAuth, checkProStatus } from '../../providers/patreon-oauth';

const THEMES = [
  { id: 'dark', label: 'Dark', dot: '#1e293b', proOnly: false },
  { id: 'light', label: 'Light', dot: '#f1f5f9', proOnly: true },
  { id: 'oled', label: 'OLED', dot: '#000000', proOnly: true },
  { id: 'solarized', label: 'Solarized', dot: '#657b83', proOnly: true },
  { id: 'forest', label: 'Forest', dot: '#2d6a4f', proOnly: true },
  { id: 'ocean', label: 'Ocean', dot: '#023e8a', proOnly: true },
] as const;

const PRO_FEATURES = [
  'Unlimited saved conversations (free: 25)',
  'Bulk export all chats as .zip',
  'Extra themes (OLED black, solarized, forest, ocean)',
  'Unlimited system-prompt presets (free: 1)',
  'Full-text search across saved chats',
  'Usage dashboard & statistics',
  'Message starring & reactions',
  'Conversation tags & folders',
  'Priority issue reporting',
  'Name in SUPPORTERS file (opt-in)',
  '🌟 Pro badge in the sidebar',
];

export const SettingsPage: React.FC = () => {
  const {
    settings,
    updateSettings,
    providers,
    conversations,
    systemPromptPresets,
    addPreset,
    deletePreset,
    memories,
    removeMemory,
  } = useStore();

  const navigate = useNavigate();
  const [showAddPreset, setShowAddPreset] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetPrompt, setPresetPrompt] = useState('');
  const [patreonLoading, setPatreonLoading] = useState(false);
  const toast = useToast();

  const stats = {
    providers: providers.length,
    enabled: providers.filter((p) => p.enabled).length,
    conversations: conversations.length,
    messages: conversations.reduce((acc, c) => acc + c.messages.length, 0),
  };

  const handleAddPreset = () => {
    if (!presetName.trim() || !presetPrompt.trim()) return;
    addPreset(presetName.trim(), presetPrompt.trim());
    setPresetName('');
    setPresetPrompt('');
    setShowAddPreset(false);
  };

  const canAddPreset = settings.isPro || systemPromptPresets.length < 1;

  const handlePatreonConnect = async (isCreator = false) => {
    setPatreonLoading(true);
    try {
      await startPatreonOAuth(isCreator);
      const status = await checkProStatus();
      if (status.isPro) {
        updateSettings({ isPro: true, patreonConnected: true, patreonName: status.name });
        toast.success(`🌟 Pro activated! Welcome, ${status.name || 'supporter'}!`);
      } else {
        const proStatus = await checkProStatus();
        updateSettings({ patreonConnected: true, patreonName: proStatus.name });
        toast.success('Connected to Patreon!');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Patreon connection failed.');
    } finally {
      setPatreonLoading(false);
    }
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

            {/* Theme */}
            <div>
              <label className="block text-sm text-white mb-2">Theme</label>
              <div className="flex flex-wrap gap-2">
                {THEMES.map((theme) => {
                  const locked = theme.proOnly && !settings.isPro;
                  return (
                    <button
                      key={theme.id}
                      onClick={() => {
                        if (locked) return;
                        updateSettings({ theme: theme.id });
                      }}
                      title={locked ? '🔒 Pro only' : theme.label}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors ${
                        settings.theme === theme.id
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : locked
                          ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
                          : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500 hover:text-white'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full border border-slate-600 shrink-0"
                        style={{ backgroundColor: theme.dot }}
                      />
                      {locked ? <Lock size={12} className="mr-0.5" /> : null}
                      {theme.label}
                    </button>
                  );
                })}
              </div>
              {!settings.isPro && (
                <p className="text-slate-500 text-xs mt-1">
                  🔒 Extra themes unlocked with{' '}
                  <a href={PATREON_URL} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">
                    Pro
                  </a>
                  . App currently uses dark theme.
                </p>
              )}
            </div>

            {/* Density */}
            <div>
              <label className="block text-sm text-white mb-2">Density</label>
              <div className="flex gap-2">
                {(['compact', 'cozy', 'comfortable'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => updateSettings({ density: d })}
                    className={`px-4 py-2 rounded-lg text-sm border transition-colors capitalize ${
                      settings.density === d
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500 hover:text-white'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Font size */}
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

        {/* System Prompt Presets */}
        <section>
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">System Prompt Presets</h2>
          <div className="space-y-2">
            {systemPromptPresets.length === 0 && (
              <p className="text-slate-500 text-xs">No presets saved yet.</p>
            )}
            {systemPromptPresets.map((preset) => (
              <div
                key={preset.id}
                className="flex items-start gap-3 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-medium">{preset.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5 truncate">{preset.prompt}</div>
                </div>
                <button
                  onClick={() => deletePreset(preset.id)}
                  className="p-1 text-slate-500 hover:text-red-400 transition-colors shrink-0"
                  title="Delete preset"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}

            {canAddPreset ? (
              showAddPreset ? (
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
                  <input
                    type="text"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    placeholder="Preset name"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                  <textarea
                    value={presetPrompt}
                    onChange={(e) => setPresetPrompt(e.target.value)}
                    placeholder="System prompt text…"
                    rows={3}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddPreset}
                      disabled={!presetName.trim() || !presetPrompt.trim()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm rounded-lg transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setShowAddPreset(false); setPresetName(''); setPresetPrompt(''); }}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddPreset(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 border-dashed text-slate-400 hover:text-white text-sm rounded-xl transition-colors"
                >
                  <Plus size={14} /> Add Preset
                </button>
              )
            ) : (
              <p className="text-xs text-amber-400">
                🔒 Unlock unlimited presets with{' '}
                <a href={PATREON_URL} target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-300">
                  Pro
                </a>
              </p>
            )}
          </div>
        </section>

        {/* Pro */}
        <section>
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">🌟 Pro</h2>
          {settings.isPro ? (
            <div className="border border-green-500/40 bg-green-900/10 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-green-400 text-lg">🌟</span>
                <p className="text-green-300 font-semibold text-sm">Pro Active — Thank you for supporting OpenClaw!</p>
              </div>
              <p className="text-slate-400 text-xs">Verified via Patreon donation</p>
              <button
                onClick={() => updateSettings({ isPro: false })}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors"
              >
                Deactivate Pro
              </button>
            </div>
          ) : (
            <div className="border border-amber-500/40 bg-amber-900/10 rounded-xl p-5 space-y-4">
              <div>
                <p className="text-amber-300 font-semibold text-base">🌟 OpenClaw Pro — Unlock the full experience</p>
                <p className="text-slate-400 text-xs mt-1">A $5+/month Patreon donation unlocks all Pro features.</p>
              </div>
              <ul className="space-y-1.5">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-slate-300">
                    <span className="text-amber-400 shrink-0">✦</span>
                    {f}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href={PATREON_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  ❤ Support on Patreon
                </a>
                <button
                  onClick={() => {
                    updateSettings({ isPro: true });
                    toast.success("🌟 Pro activated! Thank you so much for supporting SerThrocken. Every donation keeps the project alive.");
                  }}
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white text-sm rounded-lg transition-colors"
                >
                  I've donated — unlock Pro
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Integrations */}
        <section>
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">Integrations</h2>
          <div className="space-y-3">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-2xl">✨</span>
                <div className="flex-1">
                  <p className="text-white font-medium text-sm">Google Sign-In for Gemini</p>
                  <p className="text-slate-400 text-xs mt-1">
                    Enter your Google OAuth Client ID to enable "Connect with Google" in Gemini connections.
                    <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer"
                      className="text-blue-400 hover:underline ml-1">Get a Client ID →</a>
                  </p>
                </div>
              </div>
              <input
                type="text"
                value={settings.googleClientId || ''}
                onChange={e => updateSettings({ googleClientId: e.target.value })}
                placeholder="xxxx.apps.googleusercontent.com"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>
        </section>

        {/* Stats */}
        <section>
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">Statistics</h2>
          {settings.isPro ? (
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
          ) : (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
              <p className="text-slate-400 text-sm">
                🔒 Full statistics available with{' '}
                <a href={PATREON_URL} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">
                  Pro
                </a>
              </p>
              <p className="text-slate-500 text-xs mt-1">{stats.conversations} chats · {stats.messages} messages</p>
            </div>
          )}
        </section>

        {/* Patreon OAuth */}
        <section>
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">Patreon</h2>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-orange-400 text-lg">❤</span>
              <div>
                <p className="text-white text-sm font-medium">Connect with Patreon</p>
                <p className="text-slate-400 text-xs mt-0.5">
                  {settings.patreonConnected
                    ? `Connected as ${settings.patreonName || 'Patreon user'}`
                    : 'Not connected'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handlePatreonConnect(false)}
                disabled={patreonLoading}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
              >
                {patreonLoading ? 'Connecting…' : '❤ Connect with Patreon'}
              </button>
              <button
                onClick={() => handlePatreonConnect(true)}
                disabled={patreonLoading}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 text-xs rounded-lg transition-colors"
              >
                I am the creator/developer
              </button>
            </div>
          </div>
        </section>

        {/* Memory Bank */}
        <section>
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">Memory Bank</h2>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain size={16} className="text-purple-400" />
                <span className="text-white text-sm">{memories.length} memories saved</span>
              </div>
              <button
                onClick={() => navigate('/memory')}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-lg transition-colors"
              >
                Open Memory Bank →
              </button>
            </div>
            {memories.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Clear all memories? This cannot be undone.')) {
                    memories.forEach((m) => removeMemory(m.id));
                    toast.success('All memories cleared.');
                  }
                }}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Clear all memories
              </button>
            )}
          </div>
        </section>

        {/* Skills */}
        <section>
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">Skills</h2>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-blue-400" />
                <span className="text-white text-sm">
                  {(settings.activeSkillIds || []).length} active skills
                </span>
              </div>
              <button
                onClick={() => navigate('/skills')}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors"
              >
                Browse Skills →
              </button>
            </div>
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

