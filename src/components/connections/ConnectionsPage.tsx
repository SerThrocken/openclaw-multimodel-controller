import React, { useState, useMemo } from 'react';
import type { AIProvider } from '../../types';
import { useStore } from '../../store';
import { testConnection } from '../../providers/api';
import { PROVIDER_TEMPLATES, getProviderTemplate } from '../../providers/templates';
import { useToast } from '../../context/ToastContext';
import {
  Plus, Pencil, Trash2, CheckCircle, XCircle, Loader2,
  ExternalLink, ToggleLeft, ToggleRight, Search, Zap,
  Wifi, WifiOff, RefreshCw,
} from 'lucide-react';
import { ProviderForm } from './ProviderForm';

export const ConnectionsPage: React.FC = () => {
  const { providers, deleteProvider, updateProvider } = useStore();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editProvider, setEditProvider] = useState<AIProvider | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string } | 'loading'>>({});
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return providers.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.model.toLowerCase().includes(q) ||
      p.type.toLowerCase().includes(q)
    );
  }, [providers, search]);

  const handleTest = async (provider: AIProvider) => {
    setTestResults(r => ({ ...r, [provider.id]: 'loading' }));
    const result = await testConnection(provider);
    setTestResults(r => ({ ...r, [provider.id]: result }));
    if (result.success) toast.success(`${provider.name} connected!`);
    else toast.error(`${provider.name}: ${result.message.slice(0, 80)}`);
  };

  const handleDelete = (provider: AIProvider) => {
    if (confirm(`Delete "${provider.name}"? This also removes all associated conversations.`)) {
      deleteProvider(provider.id);
      toast.success(`${provider.name} removed.`);
    }
  };

  const handleToggle = (provider: AIProvider) => {
    updateProvider(provider.id, { enabled: !provider.enabled });
    toast.info(`${provider.name} ${provider.enabled ? 'disabled' : 'enabled'}.`);
  };

  const openAdd = (type?: string) => {
    const tpl = PROVIDER_TEMPLATES.find(t => t.type === type);
    setEditProvider(tpl ? {
      id: '', name: tpl.label, type: tpl.type as AIProvider['type'],
      baseUrl: tpl.defaultBaseUrl, model: tpl.defaultModel,
      enabled: true, createdAt: '', updatedAt: '', color: tpl.color,
    } : null);
    setShowForm(true);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-slate-700 bg-slate-900 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">AI Connections</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              {providers.filter(p => p.enabled).length} active · {providers.length} total
            </p>
          </div>
          <button onClick={() => openAdd()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-blue-900/40">
            <Plus size={16} /> <span className="hidden sm:inline">Add</span>
          </button>
        </div>

        {/* Search (shown when there are providers) */}
        {providers.length > 0 && (
          <div className="relative mt-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input type="search" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search connections…"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500" />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-6">

        {/* Service tiles — Quick Connect */}
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Quick Connect</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {PROVIDER_TEMPLATES.map(tpl => {
              const connected = providers.filter(p => p.type === tpl.type);
              const hasError  = connected.some(p => testResults[p.id] && testResults[p.id] !== 'loading' && !(testResults[p.id] as { success: boolean }).success);
              const hasOK     = connected.some(p => testResults[p.id] && testResults[p.id] !== 'loading' && (testResults[p.id] as { success: boolean }).success);
              return (
                <button key={tpl.type} onClick={() => openAdd(tpl.type)}
                  className="group relative flex items-center gap-3 px-3 py-3 bg-slate-800 hover:bg-slate-750
                    border border-slate-700 hover:border-slate-500 rounded-xl transition-all text-left
                    active:scale-[0.97]">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 shadow-inner"
                    style={{ backgroundColor: tpl.color + '33', border: `1px solid ${tpl.color}55` }}>
                    {tpl.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-white text-xs font-semibold truncate">{tpl.label}</div>
                    <div className="text-slate-500 text-xs">{connected.length} connected</div>
                  </div>
                  {/* Status dot */}
                  <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${
                    hasOK ? 'bg-green-400' : hasError ? 'bg-red-400' : connected.length > 0 ? 'bg-slate-500' : 'hidden'
                  }`} />
                </button>
              );
            })}
          </div>
        </section>

        {/* Connections list */}
        {filtered.length > 0 ? (
          <section>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Your Connections {search && `· "${search}"`}
            </h2>
            <div className="space-y-2">
              {filtered.map(provider => {
                const tpl = getProviderTemplate(provider.type);
                const result = testResults[provider.id];
                const isLoading = result === 'loading';
                const isOK  = result && result !== 'loading' && result.success;
                const isErr = result && result !== 'loading' && !result.success;
                const expanded = expandedId === provider.id;

                return (
                  <div key={provider.id}
                    className={`rounded-xl border overflow-hidden transition-all duration-200 ${
                      provider.enabled
                        ? 'border-slate-700 bg-slate-800/80'
                        : 'border-slate-800 bg-slate-900/60 opacity-60'
                    }`}
                    style={{ borderLeft: `3px solid ${provider.color}` }}>
                    <div className="flex items-center gap-3 px-4 py-3">
                      {/* Icon */}
                      <span className="text-xl shrink-0">{tpl?.icon || '🤖'}</span>

                      {/* Info */}
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedId(expanded ? null : provider.id)}>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-sm truncate">{provider.name}</span>
                          {isOK  && <span className="text-green-400 shrink-0"><CheckCircle size={12}/></span>}
                          {isErr && <span className="text-red-400 shrink-0"><XCircle size={12}/></span>}
                          {isLoading && <Loader2 size={12} className="text-blue-400 animate-spin shrink-0"/>}
                        </div>
                        <div className="text-xs text-slate-400 truncate">{provider.model} · {tpl?.label}</div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button onClick={() => handleTest(provider)} disabled={isLoading}
                          className="p-2 text-slate-400 hover:text-blue-400 transition-colors disabled:opacity-40" title="Test">
                          {isLoading ? <Loader2 size={15} className="animate-spin"/> : <RefreshCw size={15}/>}
                        </button>
                        <button onClick={() => handleToggle(provider)}
                          className="p-2 text-slate-400 hover:text-white transition-colors" title={provider.enabled ? 'Disable' : 'Enable'}>
                          {provider.enabled ? <ToggleRight size={18} className="text-blue-400"/> : <ToggleLeft size={18}/>}
                        </button>
                        <button onClick={() => { setEditProvider(provider); setShowForm(true); }}
                          className="p-2 text-slate-400 hover:text-white transition-colors" title="Edit">
                          <Pencil size={14}/>
                        </button>
                        <button onClick={() => handleDelete(provider)}
                          className="p-2 text-slate-400 hover:text-red-400 transition-colors" title="Delete">
                          <Trash2 size={14}/>
                        </button>
                      </div>
                    </div>

                    {/* Expanded */}
                    {expanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-slate-700 space-y-3">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                          {provider.baseUrl && <><span className="text-slate-500">Endpoint</span><span className="text-slate-300 truncate">{provider.baseUrl}</span></>}
                          <span className="text-slate-500">Temperature</span><span className="text-slate-300">{provider.temperature ?? 0.7}</span>
                          <span className="text-slate-500">Max Tokens</span><span className="text-slate-300">{provider.maxTokens ?? 2048}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {tpl?.getKeyUrl && (
                            <a href={tpl.getKeyUrl} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded-lg">
                              <ExternalLink size={11}/> Get API Key
                            </a>
                          )}
                          {tpl?.docsUrl && (
                            <a href={tpl.docsUrl} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded-lg">
                              <Zap size={11}/> Docs
                            </a>
                          )}
                        </div>
                        {isErr && (
                          <p className="text-red-400 text-xs bg-red-900/20 rounded-lg p-2 break-all">
                            {(result as { success: boolean; message: string }).message}
                          </p>
                        )}
                        {isOK && (
                          <p className="text-green-400 text-xs bg-green-900/20 rounded-lg p-2 flex items-center gap-1">
                            <Wifi size={11}/> Connected — {(result as { success: boolean; message: string }).message.slice(0, 80)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ) : providers.length > 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Search size={32} className="mx-auto mb-2 opacity-40"/>
            <p>No connections match "{search}"</p>
          </div>
        ) : (
          /* Empty state */
          <div className="text-center py-16 space-y-4 text-slate-500">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-slate-800 flex items-center justify-center">
              <WifiOff size={36} className="opacity-40"/>
            </div>
            <div>
              <p className="text-white font-semibold text-lg">No AI connections yet</p>
              <p className="text-sm mt-1">Choose a service above to get started</p>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <ProviderForm
          provider={editProvider?.id ? editProvider : undefined}
          defaultType={editProvider?.type}
          onClose={() => { setShowForm(false); setEditProvider(null); }}
        />
      )}
    </div>
  );
};
