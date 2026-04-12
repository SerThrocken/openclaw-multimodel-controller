import React, { useState } from 'react';
import { Plus, Brain, X } from 'lucide-react';
import { useStore } from '../../store';

export const MemoryBankPage: React.FC = () => {
  const { memories, addMemory, removeMemory } = useStore();
  const [showAdd, setShowAdd] = useState(false);
  const [label, setLabel] = useState('');
  const [content, setContent] = useState('');

  const handleAdd = () => {
    if (!content.trim()) return;
    addMemory(content.trim(), label.trim() || undefined);
    setLabel('');
    setContent('');
    setShowAdd(false);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-700 bg-slate-900 shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <Brain size={20} className="text-purple-400" />
          <h1 className="text-xl font-bold text-white">Memory Bank</h1>
          <span className="ml-auto text-xs text-slate-500">{memories.length} saved</span>
        </div>
        <p className="text-slate-400 text-sm">Save important context for future conversations</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {/* Add button */}
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-xl transition-colors w-full justify-center"
        >
          <Plus size={16} />
          {showAdd ? 'Cancel' : 'Add Memory'}
        </button>

        {/* Add form */}
        {showAdd && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3 animate-slide-in-bottom">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Label (optional)"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Memory content…"
              rows={4}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={!content.trim()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white text-sm rounded-lg transition-colors"
              >
                Save Memory
              </button>
              <button
                onClick={() => { setShowAdd(false); setLabel(''); setContent(''); }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {memories.length === 0 && !showAdd && (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <img
              src="/illustrations/memory-empty.svg"
              alt="No memories"
              className="w-32 h-32 opacity-60"
            />
            <div>
              <h3 className="text-white font-semibold text-base">No memories yet</h3>
              <p className="text-slate-500 text-sm mt-1">
                Save important context, facts, or preferences here.
              </p>
            </div>
          </div>
        )}

        {/* Memories list */}
        {memories.length > 0 && (
          <div className="space-y-3">
            {[...memories].reverse().map((memory) => (
              <div
                key={memory.id}
                className="flex gap-3 bg-slate-800 border border-slate-700 rounded-xl p-4"
              >
                <Brain size={16} className="text-purple-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  {memory.label && (
                    <div className="text-xs font-semibold text-purple-300 mb-1">{memory.label}</div>
                  )}
                  <p className="text-sm text-slate-200 leading-relaxed">{memory.content}</p>
                  <p className="text-xs text-slate-600 mt-2">
                    {new Date(memory.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                    {memory.source && <span className="ml-2">· from chat</span>}
                  </p>
                </div>
                <button
                  onClick={() => removeMemory(memory.id)}
                  className="p-1 text-slate-600 hover:text-red-400 transition-colors shrink-0"
                  title="Delete memory"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-slate-700 text-xs pb-4">
          Memory Bank — Openclaw by SerThrocken
        </p>
      </div>
    </div>
  );
};
