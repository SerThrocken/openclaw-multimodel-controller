import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Plug,
  Settings,
  Zap,
  Menu,
  X,
  History,
  Star,
  Brain,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useStore } from '../../store';
import { useState } from 'react';
import { PATREON_URL } from '../../constants';

const MAX_RECENT_CHATS = 5;

export const Sidebar: React.FC = () => {
  const providers = useStore((s) => s.providers);
  const conversations = useStore((s) => s.conversations);
  const settings = useStore((s) => s.settings);
  const memories = useStore((s) => s.memories);
  const setActiveConversation = useStore((s) => s.setActiveConversation);
  const enabledCount = providers.filter((p) => p.enabled).length;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showRecentChats, setShowRecentChats] = useState(true);
  const navigate = useNavigate();

  const activeSkillIds = settings.activeSkillIds || [];

  const starredCount = conversations.reduce(
    (acc, c) => acc + c.messages.filter((m) => m.starred).length,
    0,
  );

  const recentChats = [...conversations]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, MAX_RECENT_CHATS);

  const navItems = [
    { to: '/', icon: MessageSquare, label: 'Chat' },
    { to: '/skills', icon: Sparkles, label: 'Skills' },
    { to: '/memory', icon: Brain, label: 'Memory' },
    { to: '/history', icon: History, label: 'History' },
    { to: '/connections', icon: Plug, label: 'Connections' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-700 animate-slide-in-left md:animate-none">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <Zap size={18} className="text-white" />
        </div>
        <div>
          <div className="font-bold text-white text-sm leading-tight">Openclaw</div>
          <div className="text-slate-400 text-xs">MultiModel Controller</div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-slate-400">{enabledCount} provider{enabledCount !== 1 ? 's' : ''}</span>
        </div>
        {activeSkillIds.length > 0 && (
          <div className="flex items-center gap-1">
            <Sparkles size={10} className="text-blue-400" />
            <span className="text-blue-400">{activeSkillIds.length} skill{activeSkillIds.length !== 1 ? 's' : ''}</span>
          </div>
        )}
        {memories.length > 0 && (
          <div className="flex items-center gap-1">
            <Brain size={10} className="text-purple-400" />
            <span className="text-purple-400">{memories.length}</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`
            }
          >
            <Icon size={18} />
            {label}
            {label === 'Connections' && enabledCount > 0 && (
              <span className="ml-auto bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {enabledCount}
              </span>
            )}
            {label === 'Chat' && starredCount > 0 && (
              <span className="ml-auto flex items-center gap-1 text-amber-400 text-xs">
                <Star size={12} className="fill-amber-400" />
                {starredCount}
              </span>
            )}
            {label === 'Skills' && activeSkillIds.length > 0 && (
              <span className="ml-auto bg-blue-700 text-blue-200 text-xs rounded-full px-1.5 py-0.5">
                {activeSkillIds.length}
              </span>
            )}
            {label === 'Memory' && memories.length > 0 && (
              <span className="ml-auto bg-purple-800 text-purple-200 text-xs rounded-full px-1.5 py-0.5">
                {memories.length}
              </span>
            )}
          </NavLink>
        ))}

        {/* Recent chats */}
        {recentChats.length > 0 && (
          <div className="pt-2">
            <button
              onClick={() => setShowRecentChats((v) => !v)}
              className="flex items-center justify-between w-full px-3 py-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              <span className="font-semibold uppercase tracking-wide">Recent Chats</span>
              {showRecentChats ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {showRecentChats && (
              <div className="space-y-0.5 mt-1">
                {recentChats.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setActiveConversation(conv.id);
                      setMobileOpen(false);
                      navigate('/');
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors truncate"
                    title={conv.title}
                  >
                    {conv.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-700">
        <p className="text-slate-500 text-xs text-center mb-2">v1.0.0 · Openclaw</p>
        {settings.isPro ? (
          <div className="flex items-center justify-center gap-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-1.5">
            <span className="text-amber-400 text-xs font-semibold">🌟 Pro</span>
          </div>
        ) : (
          <a
            href={PATREON_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center text-slate-500 hover:text-amber-400 text-xs transition-colors"
          >
            Upgrade to Pro →
          </a>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0">{sidebarContent}</aside>

      {/* Mobile toggle */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="w-56 flex flex-col">{sidebarContent}</div>
          <div
            className="flex-1 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
        </div>
      )}
    </>
  );
};

