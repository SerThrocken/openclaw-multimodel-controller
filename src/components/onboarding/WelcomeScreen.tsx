import React, { useState } from 'react';
import { Zap, ArrowRight, ExternalLink } from 'lucide-react';
import { PROVIDER_TEMPLATES } from '../../providers/templates';
import { PATREON_URL } from '../../constants';
import { useNavigate } from 'react-router-dom';

interface WelcomeScreenProps {
  onDismiss: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onDismiss }) => {
  const [step, setStep] = useState<'welcome' | 'pick'>('welcome');
  const navigate = useNavigate();

  if (step === 'welcome') {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        {/* Logo */}
        <div className="relative mb-8">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-blue-900/60 animate-[pulse-glow_3s_ease-in-out_infinite]">
            <Zap size={36} className="text-white" />
          </div>
          <div className="absolute -inset-2 rounded-[28px] bg-gradient-to-br from-blue-500/20 to-purple-600/20 blur-xl -z-10" />
        </div>

        <h1 className="text-3xl font-bold text-white mb-2">Welcome to OpenClaw</h1>
        <p className="text-slate-400 text-base max-w-xs leading-relaxed mb-8">
          Your all-in-one AI controller for ChatGPT, Gemini, Claude, Perplexity, and more.
          Runs locally or connects to the cloud — your choice.
        </p>

        <div className="space-y-3 w-full max-w-xs">
          <button onClick={() => setStep('pick')}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-2xl text-base font-semibold transition-all shadow-lg shadow-blue-900/50">
            Get Started <ArrowRight size={18} />
          </button>
          <button onClick={onDismiss}
            className="w-full py-3 text-slate-500 hover:text-slate-300 text-sm transition-colors">
            I'll set up later
          </button>
        </div>

        <p className="mt-8 text-xs text-slate-600">
          Enjoying OpenClaw?{' '}
          <a href={PATREON_URL} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">
            Support the project ($5+/mo)
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col overflow-y-auto">
      <div className="px-6 py-6">
        <button onClick={() => setStep('welcome')} className="text-slate-500 hover:text-white text-sm mb-6">← Back</button>
        <h2 className="text-2xl font-bold text-white mb-1">Choose your AI</h2>
        <p className="text-slate-400 text-sm mb-6">Pick the service you already use. You can add more later.</p>

        <div className="space-y-2.5">
          {PROVIDER_TEMPLATES.map(tpl => (
            <button key={tpl.type}
              onClick={() => { onDismiss(); navigate('/connections'); }}
              className="w-full flex items-center gap-4 p-4 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-500 rounded-2xl transition-all active:scale-[0.98] text-left">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-inner"
                style={{ backgroundColor: tpl.color + '33' }}>
                {tpl.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-semibold">{tpl.label}</div>
                <div className="text-slate-400 text-xs mt-0.5 truncate">{tpl.description}</div>
              </div>
              {tpl.getKeyUrl ? (
                <a href={tpl.getKeyUrl} target="_blank" rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 shrink-0">
                  <ExternalLink size={11}/> Key
                </a>
              ) : (
                <span className="text-xs text-green-400 shrink-0">Free / Local</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
