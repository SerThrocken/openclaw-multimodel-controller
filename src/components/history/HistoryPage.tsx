import React, { useState, useMemo } from 'react';
import { useStore } from '../../store';
import type { Conversation } from '../../types';
import {
  Trash2,
  Archive,
  Download,
  Search,
  MessageSquare,
  CheckSquare,
  Square,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const FREE_CONVERSATION_LIMIT = 25;

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function buildArchiveBlob(conversations: Conversation[]): Blob {
  const data = JSON.stringify(conversations, null, 2);
  return new Blob([data], { type: 'application/json' });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export const HistoryPage: React.FC = () => {
  const { conversations, deleteConversation, setActiveConversation } = useStore();

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortDesc, setSortDesc] = useState(true);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = q
      ? conversations.filter(
          (c) =>
            c.title.toLowerCase().includes(q) ||
            c.messages.some((m) => m.content.toLowerCase().includes(q)),
        )
      : [...conversations];
    list.sort((a, b) => {
      const ta = a.updatedAt || a.createdAt || '';
      const tb = b.updatedAt || b.createdAt || '';
      return sortDesc ? tb.localeCompare(ta) : ta.localeCompare(tb);
    });
    return list;
  }, [conversations, search, sortDesc]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () =>
    setSelected(new Set(filtered.map((c) => c.id)));

  const clearSelection = () => setSelected(new Set());

  const handleDelete = (id: string) => {
    if (confirm('Permanently delete this conversation?')) {
      deleteConversation(id);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleDeleteSelected = () => {
    if (selected.size === 0) return;
    if (
      !confirm(
        `Permanently delete ${selected.size} conversation${selected.size !== 1 ? 's' : ''}?`,
      )
    )
      return;
    selected.forEach((id) => deleteConversation(id));
    setSelected(new Set());
  };

  const handleArchiveSelected = () => {
    const ids = selected.size > 0 ? selected : new Set(filtered.map((c) => c.id));
    const toArchive = conversations.filter((c) => ids.has(c.id));
    if (toArchive.length === 0) return;

    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const blob = buildArchiveBlob(toArchive);
    downloadBlob(blob, `openclaw-archive-${ts}.json`);

    if (
      confirm(
        `${toArchive.length} conversation${toArchive.length !== 1 ? 's' : ''} exported. Remove them from the app to free up space?`,
      )
    ) {
      toArchive.forEach((c) => deleteConversation(c.id));
      setSelected(new Set());
    }
  };

  const handleExportAll = () => {
    if (conversations.length === 0) return;
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const blob = buildArchiveBlob(conversations);
    downloadBlob(blob, `openclaw-export-${ts}.json`);
  };

  const handleLoad = (conversation: Conversation) => {
    setActiveConversation(conversation.id);
    window.location.hash = '/';
    // For react-router navigate we use window.location assignment as fallback
    // The user gets taken to chat where the active conversation is shown.
  };

  const atLimit = conversations.length >= FREE_CONVERSATION_LIMIT;
  const usagePercent = Math.min(
    100,
    Math.round((conversations.length / FREE_CONVERSATION_LIMIT) * 100),
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-700 bg-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Conversation History</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              {conversations.length} saved · {FREE_CONVERSATION_LIMIT} free-tier limit
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportAll}
              disabled={conversations.length === 0}
              title="Export all conversations to JSON"
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-200 text-xs rounded-lg transition-colors"
            >
              <Download size={14} /> Export all
            </button>
            <button
              onClick={() => {
                setSelectMode((v) => !v);
                clearSelection();
              }}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border transition-colors ${
                selectMode
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600'
              }`}
            >
              <CheckSquare size={14} /> {selectMode ? 'Cancel' : 'Select'}
            </button>
          </div>
        </div>

        {/* Storage usage bar */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Storage usage</span>
            <span>
              {conversations.length} / {FREE_CONVERSATION_LIMIT}
              {atLimit && (
                <span className="ml-2 text-amber-400 font-medium">
                  · Limit reached — archive to free up space
                </span>
              )}
            </span>
          </div>
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                usagePercent >= 100
                  ? 'bg-red-500'
                  : usagePercent >= 80
                  ? 'bg-amber-500'
                  : 'bg-blue-500'
              }`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-slate-700 bg-slate-900/60">
        {/* Search */}
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search titles and messages…"
            className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-8 pr-3 py-1.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Sort toggle */}
        <button
          onClick={() => setSortDesc((v) => !v)}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
          title={sortDesc ? 'Newest first' : 'Oldest first'}
        >
          <Clock size={13} />
          {sortDesc ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
        </button>

        {/* Bulk actions (select mode) */}
        {selectMode && (
          <>
            <button
              onClick={selected.size === filtered.length ? clearSelection : selectAll}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              {selected.size === filtered.length ? 'Deselect all' : 'Select all'}
            </button>
            <button
              onClick={handleArchiveSelected}
              disabled={selected.size === 0 && filtered.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-xs rounded-lg transition-colors"
            >
              <Archive size={12} />
              Archive {selected.size > 0 ? `(${selected.size})` : 'all'}
            </button>
            <button
              onClick={handleDeleteSelected}
              disabled={selected.size === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-700 hover:bg-red-800 disabled:opacity-40 text-white text-xs rounded-lg transition-colors"
            >
              <Trash2 size={12} />
              Delete ({selected.size})
            </button>
          </>
        )}
      </div>

      {/* Archive info banner */}
      {atLimit && (
        <div className="mx-6 mt-4 px-4 py-3 bg-amber-900/30 border border-amber-700/50 rounded-xl flex items-start gap-3">
          <Archive size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-200">
            <strong className="font-semibold">Storage full.</strong> Use{' '}
            <strong>Select → Archive</strong> to export older conversations to a{' '}
            <code>.json</code> file and remove them — keeping your history while freeing up
            space.
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              {search ? 'No conversations match your search.' : 'No saved conversations yet.'}
            </p>
          </div>
        )}

        {filtered.map((conv) => {
          const isExpanded = expandedId === conv.id;
          const isSelected = selected.has(conv.id);
          const preview = conv.messages[conv.messages.length - 1]?.content ?? '';

          return (
            <div
              key={conv.id}
              className={`border rounded-xl overflow-hidden transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-900/20'
                  : 'border-slate-700 bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                {/* Select checkbox */}
                {selectMode && (
                  <button
                    onClick={() => toggleSelect(conv.id)}
                    className="text-slate-400 hover:text-blue-400 shrink-0"
                  >
                    {isSelected ? (
                      <CheckSquare size={16} className="text-blue-400" />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>
                )}

                {/* Info */}
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : conv.id)}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white text-sm truncate">{conv.title}</span>
                    <span className="text-xs text-slate-500 bg-slate-700 px-1.5 py-0.5 rounded shrink-0">
                      {conv.messages.length} msg{conv.messages.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                    <Clock size={11} />
                    {formatDate(conv.updatedAt || conv.createdAt)}
                    {conv.messages.length > 0 && (
                      <span className="truncate text-slate-500">
                        · {preview.slice(0, 60)}{preview.length > 60 ? '…' : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleLoad(conv)}
                    className="px-2.5 py-1 bg-blue-700 hover:bg-blue-600 text-white text-xs rounded-lg transition-colors"
                    title="Open in chat"
                  >
                    Open
                  </button>
                  <button
                    onClick={() => {
                      const blob = buildArchiveBlob([conv]);
                      const ts = new Date()
                        .toISOString()
                        .replace(/[:.]/g, '-')
                        .slice(0, 19);
                      downloadBlob(blob, `openclaw-conv-${ts}.json`);
                    }}
                    className="p-1.5 text-slate-400 hover:text-amber-400 transition-colors"
                    title="Archive this conversation"
                  >
                    <Archive size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(conv.id)}
                    className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : conv.id)}
                    className="p-1.5 text-slate-400 hover:text-white transition-colors"
                  >
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>

              {/* Expanded preview */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-700 space-y-2 max-h-64 overflow-y-auto">
                  {conv.messages.length === 0 ? (
                    <p className="text-slate-500 text-xs">No messages.</p>
                  ) : (
                    conv.messages.map((m) => (
                      <div key={m.id} className="text-xs">
                        <span
                          className={`font-semibold ${
                            m.role === 'user' ? 'text-blue-400' : 'text-green-400'
                          }`}
                        >
                          {m.role === 'user' ? 'You' : 'AI'}:
                        </span>{' '}
                        <span className="text-slate-300">
                          {m.content.slice(0, 300)}
                          {m.content.length > 300 ? '…' : ''}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pro upgrade footer */}
      <div className="px-6 py-4 border-t border-slate-700 bg-slate-900">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>
            Free tier: {FREE_CONVERSATION_LIMIT} conversations max. Archiving always frees
            up space.
          </span>
          <a
            href="https://patreon.com/TLG3D?utm_medium=unknown&utm_source=join_link&utm_campaign=creatorshare_creator&utm_content=copyLink"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 transition-colors font-medium"
          >
            🌟 Unlock unlimited with Pro ($5+/mo) →
          </a>
        </div>
      </div>
    </div>
  );
};
