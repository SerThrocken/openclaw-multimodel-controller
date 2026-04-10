import React, { useState } from 'react';
import type { AIProvider } from '../../types';
import { useStore } from '../../store';
import { testConnection } from '../../providers/api';
import { PROVIDER_TEMPLATES, getProviderTemplate } from '../../providers/templates';
import {
  Plus, Pencil, Trash2, CheckCircle, XCircle, Loader2,
  ExternalLink, ChevronDown, ChevronUp, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { ProviderForm } from './ProviderForm';

export const ConnectionsPage: React.FC = () => {
  const { providers, deleteProvider, updateProvider } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [editProvider, setEditProvider] = useState<AIProvider | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string } | 'loading'>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleTest = async (provider: AIProvider) => {
    setTestResults((r) => ({ ...r, [provider.id]: 'loading' }));
    const result = await testConnection(provider);
    setTestResults((r) => ({ ...r, [provider.id]: result }));
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this AI connection? This will also remove all associated conversations.')) {
      deleteProvider(id);
    }
  };

  const handleEdit = (provider: AIProvider) => {
    setEditProvider(provider);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditProvider(null);
  };

  const toggleEnabled = (provider: AIProvider) => {
    updateProvider(provider.id, { enabled: !provider.enabled });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-900">
        <div>
          <h1 className="text-xl font-bold text-white">AI Connections</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {providers.length === 0
              ? 'No connections yet – add your first AI provider below.'
              : `${providers.length} connection${providers.length !== 1 ? 's' : ''} · ${providers.filter((p) => p.enabled).length} enabled`}
          </p>
        </div>
        <button
          onClick={() => { setEditProvider(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Add Connection
        </button>
      </div>

      {/* Provider templates quick-add */}
      {providers.length === 0 && (
        <div className="px-6 py-6 border-b border-slate-700">
          <h2 className="text-sm font-semibold text-slate-300 mb-3">Quick Add a Provider</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {PROVIDER_TEMPLATES.map((tpl) => (
              <button
                key={tpl.type}
                onClick={() => {
                  setEditProvider({
                    id: '',
                    name: tpl.label,
                    type: tpl.type,
                    baseUrl: tpl.defaultBaseUrl,
                    model: tpl.defaultModel,
                    enabled: true,
                    createdAt: '',
                    updatedAt: '',
                    color: tpl.color,
                  });
                  setShowForm(true);
                }}
                className="flex flex-col items-center gap-2 p-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg transition-colors text-center"
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: tpl.color }}>
                  {tpl.label[0]}
                </div>
                <span className="text-xs text-slate-300 font-medium">{tpl.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Connections list */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {providers.map((provider) => {
          const template = getProviderTemplate(provider.type);
          const testResult = testResults[provider.id];
          const isExpanded = expandedId === provider.id;

          return (
            <div
              key={provider.id}
              className={`border rounded-xl overflow-hidden transition-all ${
                provider.enabled ? 'border-slate-600 bg-slate-800' : 'border-slate-700 bg-slate-850 opacity-60'
              }`}
            >
              {/* Card header */}
              <div className="flex items-center gap-3 px-4 py-3">
                {/* Color dot */}
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: provider.color }}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-sm truncate">{provider.name}</span>
                    <span className="text-xs text-slate-500 bg-slate-700 px-2 py-0.5 rounded shrink-0">
                      {template?.label || provider.type}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 truncate">{provider.model}</div>
                </div>

                {/* Test result badge */}
                {testResult && testResult !== 'loading' && (
                  <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full shrink-0 ${
                    testResult.success ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                  }`}>
                    {testResult.success ? <CheckCircle size={12} /> : <XCircle size={12} />}
                    {testResult.success ? 'OK' : 'Error'}
                  </div>
                )}
                {testResult === 'loading' && (
                  <Loader2 size={14} className="text-blue-400 animate-spin shrink-0" />
                )}

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleEnabled(provider)}
                    className="p-1.5 rounded text-slate-400 hover:text-white transition-colors"
                    title={provider.enabled ? 'Disable' : 'Enable'}
                  >
                    {provider.enabled ? <ToggleRight size={18} className="text-blue-400" /> : <ToggleLeft size={18} />}
                  </button>
                  <button
                    onClick={() => handleEdit(provider)}
                    className="p-1.5 rounded text-slate-400 hover:text-white transition-colors"
                    title="Edit"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(provider.id)}
                    className="p-1.5 rounded text-slate-400 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : provider.id)}
                    className="p-1.5 rounded text-slate-400 hover:text-white transition-colors"
                  >
                    {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-700 space-y-3">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    {provider.baseUrl && (
                      <>
                        <span className="text-slate-500">Base URL</span>
                        <span className="text-slate-300 truncate">{provider.baseUrl}</span>
                      </>
                    )}
                    <span className="text-slate-500">Temperature</span>
                    <span className="text-slate-300">{provider.temperature ?? 0.7}</span>
                    <span className="text-slate-500">Max Tokens</span>
                    <span className="text-slate-300">{provider.maxTokens ?? 2048}</span>
                    {provider.systemPrompt && (
                      <>
                        <span className="text-slate-500">System Prompt</span>
                        <span className="text-slate-300 truncate">{provider.systemPrompt}</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleTest(provider)}
                      disabled={testResult === 'loading'}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded-lg transition-colors disabled:opacity-50"
                    >
                      {testResult === 'loading' ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                      Test Connection
                    </button>
                    {template?.docsUrl && (
                      <a
                        href={template.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded-lg transition-colors"
                      >
                        <ExternalLink size={12} /> Docs
                      </a>
                    )}
                  </div>

                  {testResult && testResult !== 'loading' && !testResult.success && (
                    <p className="text-red-400 text-xs bg-red-900/20 rounded p-2 break-all">
                      {testResult.message}
                    </p>
                  )}
                  {testResult && testResult !== 'loading' && testResult.success && (
                    <p className="text-green-400 text-xs bg-green-900/20 rounded p-2 line-clamp-2">
                      Response: {testResult.message}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <ProviderForm
          provider={editProvider?.id ? editProvider : undefined}
          defaultType={editProvider?.type}
          onClose={handleFormClose}
        />
      )}
    </div>
  );
};
