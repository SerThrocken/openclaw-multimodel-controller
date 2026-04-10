import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { AIProvider, Conversation, Message, AppSettings, SystemPromptPreset } from '../types';

interface AppStore {
  // Providers
  providers: AIProvider[];
  addProvider: (provider: Omit<AIProvider, 'id' | 'createdAt' | 'updatedAt'>) => AIProvider;
  updateProvider: (id: string, updates: Partial<AIProvider>) => void;
  deleteProvider: (id: string) => void;
  getProvider: (id: string) => AIProvider | undefined;

  // Conversations
  conversations: Conversation[];
  activeConversationId: string | null;
  addConversation: (providerId: string, title?: string) => Conversation;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  deleteConversation: (id: string) => void;
  setActiveConversation: (id: string | null) => void;
  getActiveConversation: () => Conversation | undefined;
  addMessage: (conversationId: string, message: Omit<Message, 'id' | 'timestamp'>) => Message;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void;
  toggleStarMessage: (conversationId: string, messageId: string) => void;
  updateConversationTags: (id: string, tags: string[]) => void;

  // System Prompt Presets
  systemPromptPresets: SystemPromptPreset[];
  addPreset: (name: string, prompt: string) => SystemPromptPreset;
  deletePreset: (id: string) => void;
  updatePreset: (id: string, updates: Partial<{ name: string; prompt: string }>) => void;

  // Settings
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;

  // Active Provider for Chat
  activeChatProviderId: string | null;
  setActiveChatProvider: (id: string | null) => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  sendOnEnter: true,
  showTimestamps: false,
  fontSize: 'md',
  streamResponses: false,
  density: 'cozy',
  isPro: false,
};

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      providers: [],
      conversations: [],
      activeConversationId: null,
      activeChatProviderId: null,
      settings: DEFAULT_SETTINGS,
      systemPromptPresets: [],

      addProvider: (providerData) => {
        const now = new Date().toISOString();
        const provider: AIProvider = {
          ...providerData,
          id: uuidv4(),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ providers: [...state.providers, provider] }));
        return provider;
      },

      updateProvider: (id, updates) => {
        set((state) => ({
          providers: state.providers.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p,
          ),
        }));
      },

      deleteProvider: (id) => {
        set((state) => ({
          providers: state.providers.filter((p) => p.id !== id),
          conversations: state.conversations.filter((c) => c.providerId !== id),
          activeChatProviderId:
            state.activeChatProviderId === id ? null : state.activeChatProviderId,
        }));
      },

      getProvider: (id) => get().providers.find((p) => p.id === id),

      addConversation: (providerId, title) => {
        const now = new Date().toISOString();
        const conversation: Conversation = {
          id: uuidv4(),
          title: title || `New Chat ${new Date().toLocaleString()}`,
          providerId,
          messages: [],
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          conversations: [conversation, ...state.conversations],
          activeConversationId: conversation.id,
        }));
        return conversation;
      },

      updateConversation: (id, updates) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c,
          ),
        }));
      },

      deleteConversation: (id) => {
        set((state) => ({
          conversations: state.conversations.filter((c) => c.id !== id),
          activeConversationId:
            state.activeConversationId === id ? null : state.activeConversationId,
        }));
      },

      setActiveConversation: (id) => set({ activeConversationId: id }),

      getActiveConversation: () => {
        const { conversations, activeConversationId } = get();
        return conversations.find((c) => c.id === activeConversationId);
      },

      addMessage: (conversationId, messageData) => {
        const message: Message = {
          ...messageData,
          id: uuidv4(),
          timestamp: new Date().toISOString(),
        };
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  messages: [...c.messages, message],
                  updatedAt: new Date().toISOString(),
                }
              : c,
          ),
        }));
        return message;
      },

      updateMessage: (conversationId, messageId, updates) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === messageId ? { ...m, ...updates } : m,
                  ),
                }
              : c,
          ),
        }));
      },

      toggleStarMessage: (conversationId, messageId) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === messageId ? { ...m, starred: !m.starred } : m,
                  ),
                }
              : c,
          ),
        }));
      },

      updateConversationTags: (id, tags) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, tags, updatedAt: new Date().toISOString() } : c,
          ),
        }));
      },

      addPreset: (name, prompt) => {
        const preset: SystemPromptPreset = {
          id: uuidv4(),
          name,
          prompt,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ systemPromptPresets: [...state.systemPromptPresets, preset] }));
        return preset;
      },

      deletePreset: (id) => {
        set((state) => ({
          systemPromptPresets: state.systemPromptPresets.filter((p) => p.id !== id),
        }));
      },

      updatePreset: (id, updates) => {
        set((state) => ({
          systemPromptPresets: state.systemPromptPresets.map((p) =>
            p.id === id ? { ...p, ...updates } : p,
          ),
        }));
      },

      setActiveChatProvider: (id) => set({ activeChatProviderId: id }),

      updateSettings: (updates) => {
        set((state) => ({ settings: { ...state.settings, ...updates } }));
      },
    }),
    {
      name: 'openclaw-storage',
      partialize: (state) => ({
        providers: state.providers,
        conversations: state.conversations,
        settings: state.settings,
        activeChatProviderId: state.activeChatProviderId,
        systemPromptPresets: state.systemPromptPresets,
      }),
    },
  ),
);

