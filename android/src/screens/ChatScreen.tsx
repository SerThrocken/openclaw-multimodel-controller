/**
 * ChatScreen
 *
 * Full chat interface that sends messages to the PC server's
 * /chat/completions endpoint.  Supports both streaming and non-streaming
 * responses, and shows which backend/model is active.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ChatMessage, chatCompletion, chatCompletionStream } from "../api/client";
import { getSettings } from "../store/settings";

interface DisplayMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  streaming?: boolean;
}

let msgCounter = 0;
const nextId = () => String(++msgCounter);

export default function ChatScreen() {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeModel, setActiveModel] = useState<string>("(no model selected)");
  const [backend, setBackend] = useState<"lmstudio" | "ollama">("lmstudio");
  const listRef = useRef<FlatList<DisplayMessage>>(null);

  useEffect(() => {
    getSettings().then((s) => {
      if (s.activeModel) setActiveModel(s.activeModel);
      setBackend(s.backend);
    });
  }, []);

  const scrollToBottom = useCallback(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    const userMsg: DisplayMessage = { id: nextId(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);

    const settings = await getSettings();
    const model = settings.activeModel || undefined;

    // Build history for the API call
    const history: ChatMessage[] = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }));
    history.push({ role: "user", content: text });

    const assistantId = nextId();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", streaming: true },
    ]);
    setLoading(true);

    try {
      let accumulated = "";

      await chatCompletionStream(
        { model, messages: history },
        (delta) => {
          accumulated += delta;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: accumulated } : m
            )
          );
          scrollToBottom();
        },
        () => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, streaming: false } : m
            )
          );
          setLoading(false);
        }
      );
    } catch {
      // Streaming failed — fall back to non-streaming
      try {
        const resp = await chatCompletion({ model, messages: history });
        const content = resp.choices[0]?.message.content ?? "";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content, streaming: false } : m
          )
        );
      } catch (e: any) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `Error: ${e.message}`, streaming: false }
              : m
          )
        );
      } finally {
        setLoading(false);
      }
    }
  }, [input, loading, messages, scrollToBottom]);

  const clearChat = useCallback(() => {
    setMessages([]);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: DisplayMessage }) => (
      <View
        style={[
          styles.bubble,
          item.role === "user" ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        <Text
          style={[
            styles.bubbleText,
            item.role === "user" ? styles.userText : styles.assistantText,
          ]}
        >
          {item.content}
          {item.streaming && <Text style={styles.cursor}> ▌</Text>}
        </Text>
      </View>
    ),
    []
  );

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={88}
    >
      {/* Header bar */}
      <View style={styles.headerBar}>
        <View style={[styles.badge, backend === "lmstudio" ? styles.badgeLM : styles.badgeOl]}>
          <Text style={styles.badgeText}>
            {backend === "lmstudio" ? "LM Studio" : "Ollama"}
          </Text>
        </View>
        <Text style={styles.modelLabel} numberOfLines={1}>
          {activeModel}
        </Text>
        <TouchableOpacity onPress={clearChat}>
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>
      </View>

      {messages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🤖</Text>
          <Text style={styles.emptyText}>Start a conversation</Text>
          <Text style={styles.emptySubText}>
            Running locally via {backend === "lmstudio" ? "LM Studio" : "Ollama"} — fully private.
          </Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={scrollToBottom}
        />
      )}

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          value={input}
          onChangeText={setInput}
          placeholder="Type a message…"
          placeholderTextColor="#666"
          multiline
          returnKeyType="default"
          editable={!loading}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!input.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendBtnText}>▲</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const BLUE = "#4A90D9";
const BG = "#1a1a2e";
const CARD = "#16213e";
const TEXT = "#e0e0e0";
const MUTED = "#a0a0b0";

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: BG },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a4e",
    gap: 8,
  },
  badge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  badgeLM: { backgroundColor: "#4A90D944" },
  badgeOl: { backgroundColor: "#4CAF5044" },
  badgeText: { color: TEXT, fontSize: 12, fontWeight: "600" },
  modelLabel: { flex: 1, color: MUTED, fontSize: 12 },
  clearText: { color: BLUE, fontSize: 13 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: TEXT, fontSize: 18, fontWeight: "600", marginBottom: 8 },
  emptySubText: { color: MUTED, fontSize: 13, textAlign: "center" },
  messageList: { padding: 12, paddingBottom: 4 },
  bubble: { maxWidth: "80%", borderRadius: 16, padding: 12, marginVertical: 4 },
  userBubble: { alignSelf: "flex-end", backgroundColor: BLUE },
  assistantBubble: { alignSelf: "flex-start", backgroundColor: CARD },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  userText: { color: "#fff" },
  assistantText: { color: TEXT },
  cursor: { color: BLUE },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 8,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#2a2a4e",
  },
  textInput: {
    flex: 1,
    backgroundColor: CARD,
    color: TEXT,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: "#2a2a4e",
  },
  sendBtn: {
    backgroundColor: BLUE,
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
