/**
 * ModelsScreen
 *
 * Fetches the list of models available on the active backend and lets the
 * user select which model to use for chat.  The selection is persisted locally
 * and also pushed to the PC server via /settings.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { listModels, ModelInfo, updateSettings } from "../api/client";
import { getSettings, saveSettings } from "../store/settings";

export default function ModelsScreen() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState<string>("");
  const [backend, setBackend] = useState<"lmstudio" | "ollama">("lmstudio");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fetchedModels, settings] = await Promise.all([listModels(), getSettings()]);
      setModels(fetchedModels);
      setActiveModel(settings.activeModel);
      setBackend(settings.backend);
    } catch (e: any) {
      setError(e.message ?? "Failed to fetch models");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectModel = useCallback(async (modelId: string) => {
    setActiveModel(modelId);
    await saveSettings({ activeModel: modelId });
    try {
      await updateSettings({ active_model: modelId });
    } catch {
      // Offline — local selection still saved
    }
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={BLUE} />
        <Text style={styles.loadingText}>Loading models…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={[styles.badge, backend === "lmstudio" ? styles.badgeLM : styles.badgeOl]}>
          <Text style={styles.badgeText}>
            {backend === "lmstudio" ? "LM Studio" : "Ollama"}
          </Text>
        </View>
        <TouchableOpacity onPress={load}>
          <Text style={styles.refreshText}>↻ Refresh</Text>
        </TouchableOpacity>
      </View>

      {models.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No models found.</Text>
          <Text style={styles.emptySubText}>
            Make sure {backend === "lmstudio" ? "LM Studio" : "Ollama"} is running and has
            at least one model loaded.
          </Text>
        </View>
      ) : (
        <FlatList
          data={models}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => {
            const active = item.id === activeModel;
            return (
              <TouchableOpacity
                style={[styles.modelRow, active && styles.modelRowActive]}
                onPress={() => selectModel(item.id)}
                activeOpacity={0.7}
              >
                <View style={styles.modelInfo}>
                  <Text style={[styles.modelName, active && styles.modelNameActive]}>
                    {item.id}
                  </Text>
                  <Text style={styles.modelObj}>{item.object}</Text>
                </View>
                {active && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const BLUE = "#4A90D9";
const BG = "#1a1a2e";
const CARD = "#16213e";
const TEXT = "#e0e0e0";
const MUTED = "#a0a0b0";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG, paddingTop: 12 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  loadingText: { color: MUTED, marginTop: 12, fontSize: 14 },
  errorText: { color: "#F44336", fontSize: 15, textAlign: "center", marginBottom: 16 },
  retryBtn: {
    backgroundColor: BLUE,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryBtnText: { color: "#fff", fontWeight: "700" },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  badge: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  badgeLM: { backgroundColor: "#4A90D944" },
  badgeOl: { backgroundColor: "#4CAF5044" },
  badgeText: { color: TEXT, fontWeight: "600", fontSize: 13 },
  refreshText: { color: BLUE, fontSize: 14 },
  modelRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#2a2a4e",
  },
  modelRowActive: { borderColor: BLUE },
  modelInfo: { flex: 1 },
  modelName: { color: TEXT, fontSize: 15, fontWeight: "600" },
  modelNameActive: { color: BLUE },
  modelObj: { color: MUTED, fontSize: 12, marginTop: 2 },
  checkmark: { color: BLUE, fontSize: 20, fontWeight: "700" },
  emptyText: { color: TEXT, fontSize: 16, marginBottom: 8 },
  emptySubText: { color: MUTED, fontSize: 13, textAlign: "center" },
});
