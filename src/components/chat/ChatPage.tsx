import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../../store';
import { sendMessage } from '../../providers/api';
import type { Message } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import {
  Send, Plus, Bot, User, ChevronDown,
  AlertCircle, Loader2, MessageSquarePlus, X,
} from 'lucide-react';
import { getProviderTemplate } from '../../providers/templates';

const MarkdownText: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split('\n');
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith('```')) return null;
        const formatted = line
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/`(.*?)`/g, '<code class="bg-slate-700 px-1 rounded text-xs">$1</code>');
        return (
          <p key={i} dangerouslySetInnerHTML={{ __html: formatted || '&nbsp;' }} className="leading-relaxed" />
        );
      })}
    </div>
  );
};

export const ChatPage: React.FC = () => {
  const {
    providers,
    conversations,
    activeConversationId,
    activeChatProviderId,
    addConversation,
    deleteConversation,
    setActiveConversation,
    setActiveChatProvider,
    getActiveConversation,
    addMessage,
    updateMessage,
    settings,
  } = useStore();

  const enabledProviders = providers.filter((p) => p.enabled);
  const activeConversation = getActiveConversation();
  const activeProvider = providers.find((p) => p.id === activeChatProviderId) || enabledProviders[0];

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showProviderPicker, setShowProviderPicker] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => scrollToBottom(), [activeConversation?.messages.length, scrollToBottom]);

  const handleNewChat = () => {
    if (!activeProvider) return;
    const conv = addConversation(activeProvider.id);
    setActiveConversation(conv.id);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !activeProvider) return;

    let convId = activeConversationId;
    if (!convId || !activeConversation) {
      const conv = addConversation(activeProvider.id, input.slice(0, 50));
      convId = conv.id;
    }

    const userMsg = addMessage(convId, {
      role: 'user',
      content: input.trim(),
      providerId: activeProvider.id,
      providerName: activeProvider.name,
    });

    setInput('');
    setIsLoading(true);

    // Add loading assistant message
    const loadingMsgId = uuidv4();
    addMessage(convId, {
      role: 'assistant',
      content: '',
      providerId: activeProvider.id,
      providerName: activeProvider.name,
      loading: true,
    });

    // We need to get the actual loading message id
    // Instead, use updateMessage after - get conversation messages snapshot
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const conv = useStore.getState().conversations.find((c) => c.id === convId);
      const loadingMsg = conv?.messages[conv.messages.length - 1];

      const history: Message[] = [
        ...(conv?.messages.filter((m) => !m.loading && m.id !== loadingMsg?.id) || []),
      ];

      const response = await sendMessage({
        provider: activeProvider,
        messages: history,
        signal: controller.signal,
      });

      if (loadingMsg) {
        updateMessage(convId, loadingMsg.id, { content: response, loading: false });
      }
    } catch (err) {
      const conv = useStore.getState().conversations.find((c) => c.id === convId);
      const loadingMsg = conv?.messages[conv.messages.length - 1];
      if (loadingMsg && !controller.signal.aborted) {
        updateMessage(convId, loadingMsg.id, {
          content: err instanceof Error ? err.message : 'Request failed.',
          loading: false,
          error: true,
        });
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
      void userMsg; // suppress unused warning
      void loadingMsgId;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (settings.sendOnEnter && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAbort = () => {
    abortRef.current?.abort();
    setIsLoading(false);
  };

  if (enabledProviders.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center">
          <Bot size={32} className="text-slate-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white mb-1">No AI Connections</h2>
          <p className="text-slate-400 text-sm max-w-xs">
            Add an AI provider in the Connections tab to start chatting.
          </p>
        </div>
        <a
          href="/connections"
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors"
        >
          Add Connection
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      {/* Conversation sidebar */}
      {showSidebar && (
        <aside className="w-56 shrink-0 border-r border-slate-700 bg-slate-900 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 py-3 border-b border-slate-700">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Chats</span>
            <button
              onClick={handleNewChat}
              className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
              title="New Chat"
            >
              <MessageSquarePlus size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {conversations.length === 0 ? (
              <p className="text-slate-500 text-xs text-center mt-8 px-3">No conversations yet</p>
            ) : (
              conversations.map((conv) => {
                const prov = providers.find((p) => p.id === conv.providerId);
                return (
                  <div
                    key={conv.id}
                    onClick={() => setActiveConversation(conv.id)}
                    className={`group flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                      conv.id === activeConversationId
                        ? 'bg-blue-600/20 text-white'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: prov?.color || '#6b7280' }}
                    />
                    <span className="text-xs truncate flex-1">{conv.title}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400 transition-all"
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Chat header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700 bg-slate-900 shrink-0">
          <button
            onClick={() => setShowSidebar((v) => !v)}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronDown size={16} className={`transition-transform ${showSidebar ? '-rotate-90' : 'rotate-90'}`} />
          </button>

          {/* Provider selector */}
          <div className="relative">
            <button
              onClick={() => setShowProviderPicker((v) => !v)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-sm text-white transition-colors"
            >
              {activeProvider && (
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: activeProvider.color }} />
              )}
              <span className="max-w-[140px] truncate">{activeProvider?.name || 'Select Provider'}</span>
              <ChevronDown size={14} className="text-slate-400" />
            </button>

            {showProviderPicker && (
              <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-600 rounded-xl shadow-xl z-20 min-w-[200px] overflow-hidden">
                {enabledProviders.map((p) => {
                  const tpl = getProviderTemplate(p.type);
                  return (
                    <button
                      key={p.id}
                      onClick={() => { setActiveChatProvider(p.id); setShowProviderPicker(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-slate-700 transition-colors text-left ${
                        p.id === activeProvider?.id ? 'bg-blue-600/20 text-white' : 'text-slate-300'
                      }`}
                    >
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                      <div>
                        <div className="font-medium text-xs">{p.name}</div>
                        <div className="text-slate-500 text-xs">{tpl?.label || p.type} · {p.model}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex-1" />
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-300 hover:text-white transition-colors"
          >
            <Plus size={14} /> New Chat
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" onClick={() => setShowProviderPicker(false)}>
          {!activeConversation || activeConversation.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: activeProvider?.color + '33' }}
              >
                <Bot size={28} style={{ color: activeProvider?.color }} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {activeProvider ? `Chat with ${activeProvider.name}` : 'Start a conversation'}
                </h3>
                <p className="text-slate-400 text-sm mt-1">
                  {activeProvider?.model} · Send a message to begin
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md w-full">
                {['What can you help me with?', 'Write me a short story', 'Explain quantum computing', 'Help me debug my code'].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="text-left text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg px-3 py-2 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            activeConversation.messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} showTimestamp={settings.showTimestamps} fontSize={settings.fontSize} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="shrink-0 px-4 py-3 border-t border-slate-700 bg-slate-900">
          <div className="flex items-end gap-2 max-w-4xl mx-auto">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${activeProvider?.name || ''}… (${settings.sendOnEnter ? 'Enter to send' : 'Ctrl+Enter to send'})`}
              rows={1}
              className="flex-1 bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 resize-none min-h-[44px] max-h-32 overflow-y-auto"
              style={{ lineHeight: '1.5' }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = 'auto';
                el.style.height = Math.min(el.scrollHeight, 128) + 'px';
              }}
            />
            {isLoading ? (
              <button
                onClick={handleAbort}
                className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors shrink-0"
                title="Stop"
              >
                <X size={16} />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim() || !activeProvider}
                className="p-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors shrink-0"
                title="Send"
              >
                <Send size={16} />
              </button>
            )}
          </div>
          <p className="text-slate-600 text-xs text-center mt-1.5">
            AI responses may be inaccurate. Verify important information.
          </p>
        </div>
      </div>
    </div>
  );
};

const MessageBubble: React.FC<{
  message: Message;
  showTimestamp: boolean;
  fontSize: 'sm' | 'md' | 'lg';
}> = ({ message, showTimestamp, fontSize }) => {
  const isUser = message.role === 'user';
  const fontClass = fontSize === 'sm' ? 'text-xs' : fontSize === 'lg' ? 'text-base' : 'text-sm';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${
        isUser ? 'bg-blue-600' : 'bg-slate-700'
      }`}>
        {isUser ? <User size={14} className="text-white" /> : <Bot size={14} className="text-slate-300" />}
      </div>

      <div className={`flex flex-col gap-1 max-w-[80%] ${isUser ? 'items-end' : ''}`}>
        {/* Provider name */}
        {!isUser && message.providerName && (
          <span className="text-xs text-slate-500 px-1">{message.providerName}</span>
        )}

        {/* Bubble */}
        <div className={`rounded-2xl px-4 py-2.5 ${fontClass} ${
          isUser
            ? 'bg-blue-600 text-white rounded-tr-sm'
            : message.error
            ? 'bg-red-900/40 text-red-300 border border-red-800'
            : 'bg-slate-800 text-slate-100 rounded-tl-sm'
        }`}>
          {message.loading ? (
            <div className="flex items-center gap-2 text-slate-400">
              <Loader2 size={14} className="animate-spin" />
              <span className="text-xs">Thinking…</span>
            </div>
          ) : message.error ? (
            <div className="flex items-start gap-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{message.content}</span>
            </div>
          ) : (
            <MarkdownText content={message.content} />
          )}
        </div>

        {showTimestamp && (
          <span className="text-xs text-slate-600 px-1">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  );
};
