import React from 'react';
import { NavLink } from 'react-router-dom';
import { MessageSquare, History, Settings, Sparkles } from 'lucide-react';

const items = [
  { to: '/',        icon: MessageSquare, label: 'Chat'     },
  { to: '/skills',  icon: Sparkles,      label: 'Skills'   },
  { to: '/history', icon: History,       label: 'History'  },
  { to: '/settings',icon: Settings,      label: 'Settings' },
];

export const BottomNav: React.FC = () => (
  <nav className="md:hidden fixed bottom-0 inset-x-0 z-40
    bg-slate-900/95 backdrop-blur-md border-t border-slate-700
    flex items-center justify-around px-2 pb-safe pt-1
    safe-area-bottom">
    {items.map(({ to, icon: Icon, label }) => (
      <NavLink key={to} to={to} end={to === '/'}
        className={({ isActive }) =>
          `flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl text-xs font-medium transition-all
           ${isActive ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`
        }>
        {({ isActive }) => (
          <>
            <Icon size={22} strokeWidth={isActive ? 2.5 : 1.75} />
            <span>{label}</span>
          </>
        )}
      </NavLink>
    ))}
  </nav>
);
