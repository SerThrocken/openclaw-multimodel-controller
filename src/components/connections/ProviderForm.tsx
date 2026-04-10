import React, { useState, useEffect } from 'react';
import type { AIProvider, ProviderType } from '../../types';
import { useStore } from '../../store';
import { PROVIDER_TEMPLATES, getProviderTemplate } from '../../providers/templates';
import { X, Eye, EyeOff, ChevronDown } from 'lucide-react';

interface ProviderFormProps {
  provider?: AIProvider;
  defaultType?: ProviderType;
  onClose: () => void;
}

export const ProviderForm: React.FC<ProviderFormProps> = ({ provider, defaultType, onClose }) => {
  const { addProvider, updateProvider } = useStore();
  const isEdit = !!provider?.id;

  const selectedTemplate = getProviderTemplate(defaultType || 'openai');

  const [form, setForm] = useState({
    name: provider?.name || selectedTemplate?.label || 'New Connection',
    type: (provider?.type || defaultType || 'openai') as ProviderType,
    apiKey: provider?.apiKey || '',
    baseUrl: provider?.baseUrl || selectedTemplate?.defaultBaseUrl || '',
    model: provider?.model || selectedTemplate?.defaultModel || '',
    systemPrompt: provider?.systemPrompt || '',
    temperature: provider?.temperature ?? 0.7,
    maxTokens: provider?.maxTokens ?? 2048,
    enabled: provider?.enabled ?? true,
    color: provider?.color || selectedTemplate?.color || '#6b7280',
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const [customModel, setCustomModel] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const template = getProviderTemplate(form.type);

  useEffect(() => {
    if (!isEdit && template) {
      setForm((f) => ({
        ...f,
        name: template.label,
        baseUrl: template.defaultBaseUrl,
        model: template.defaultModel,
        color: template.color,
      }));
    }
  }, [form.type, isEdit, template]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (template?.requiresApiKey && !form.apiKey.trim()) errs.apiKey = 'API key is required';
    if (!form.model.trim()) errs.model = 'Model is required';
    if (!form.baseUrl.trim()) errs.baseUrl = 'Base URL is required';
    return errs;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const data = {
      ...form,
      model: customModel.trim() || form.model,
    };

    if (isEdit) {
      updateProvider(provider.id, data);
    } else {
      addProvider(data);
    }
    onClose();
  };

  const set = (key: string, value: unknown) => setForm((f) => ({ ...f, [key]: value }));

  const modelOptions = template?.modelOptions || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="text-lg font-bold text-white">
            {isEdit ? 'Edit Connection' : 'Add AI Connection'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Provider Type */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Provider</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {PROVIDER_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.type}
                  type="button"
                  onClick={() => set('type', tpl.type)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-all ${
                    form.type === tpl.type
                      ? 'border-blue-500 bg-blue-900/30 text-white'
                      : 'border-slate-600 bg-slate-800 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: tpl.color }}
                  >
                    {tpl.label[0]}
                  </div>
                  <span className="truncate w-full text-center">{tpl.label.split(' ')[0]}</span>
                </button>
              ))}
            </div>
            {template && (
              <p className="text-slate-500 text-xs mt-1.5">{template.description}</p>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Name</label>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              placeholder="My GPT-4 Connection"
            />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* API Key */}
          {template?.requiresApiKey !== false && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                API Key {!template?.requiresApiKey && <span className="text-slate-500">(optional)</span>}
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={form.apiKey}
                  onChange={(e) => set('apiKey', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 pr-10 text-white text-sm focus:outline-none focus:border-blue-500"
                  placeholder="sk-..."
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.apiKey && <p className="text-red-400 text-xs mt-1">{errors.apiKey}</p>}
            </div>
          )}

          {/* Base URL */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Base URL</label>
            <input
              value={form.baseUrl}
              onChange={(e) => set('baseUrl', e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              placeholder="https://api.openai.com/v1"
            />
            {errors.baseUrl && <p className="text-red-400 text-xs mt-1">{errors.baseUrl}</p>}
          </div>

          {/* Model */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Model</label>
            {modelOptions.length > 0 && (
              <div className="relative mb-2">
                <select
                  value={form.model}
                  onChange={(e) => { set('model', e.target.value); setCustomModel(''); }}
                  className="w-full appearance-none bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 pr-8 text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  {modelOptions.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            )}
            <input
              value={customModel}
              onChange={(e) => setCustomModel(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              placeholder="Or type a custom model name..."
            />
            {errors.model && <p className="text-red-400 text-xs mt-1">{errors.model}</p>}
          </div>

          {/* Advanced Settings (collapsible) */}
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-slate-400 hover:text-white flex items-center gap-1 select-none">
              <ChevronDown size={14} className="group-open:rotate-180 transition-transform" />
              Advanced Settings
            </summary>
            <div className="mt-3 space-y-3">
              {/* System Prompt */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">System Prompt</label>
                <textarea
                  value={form.systemPrompt}
                  onChange={(e) => set('systemPrompt', e.target.value)}
                  rows={3}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
                  placeholder="You are a helpful assistant..."
                />
              </div>

              {/* Temperature + Max Tokens */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Temperature ({form.temperature})
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={form.temperature}
                    onChange={(e) => set('temperature', parseFloat(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Max Tokens</label>
                  <input
                    type="number"
                    min="256"
                    max="128000"
                    value={form.maxTokens}
                    onChange={(e) => set('maxTokens', parseInt(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => set('color', e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                  />
                  <span className="text-slate-400 text-xs">{form.color}</span>
                </div>
              </div>
            </div>
          </details>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => set('enabled', e.target.checked)}
                className="accent-blue-500"
              />
              Enabled
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-400 hover:text-white text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {isEdit ? 'Save Changes' : 'Add Connection'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
