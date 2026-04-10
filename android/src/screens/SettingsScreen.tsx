/**
 * SettingsScreen
 *
 * Lets the user configure:
 *  - PC server IP and port
 *  - Which backend to use (LM Studio or Ollama)
 *  - Optional auth token
 *
 * Includes a "Test Connection" button that pings /health.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { healthCheck, updateSettings } from "../api/client";
import { AppSettings, BackendType, getSettings, saveSettings } from "../store/settings";

export default function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings>({
    serverHost: "192.168.1.100",
    serverPort: 8080,
    authToken: "",
    activeModel: "",
    backend: "lmstudio",
  });
  const [testing, setTesting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [statusOk, setStatusOk] = useState(false);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const handleSave = useCallback(async () => {
    await saveSettings(settings);
    // Propagate backend change to the PC server as well
    try {
      await updateSettings({
        backend: settings.backend,
        auth_token: settings.authToken,
      });
    } catch {
      // Server may be offline — local save is enough
    }
    Alert.alert("Saved", "Settings saved successfully.");
  }, [settings]);

  const handleTest = useCallback(async () => {
    setTesting(true);
    setStatusMsg(null);
    try {
      const health = await healthCheck();
      const lm = health.lmstudio_available ? "✓" : "✗";
      const ol = health.ollama_available ? "✓" : "✗";
      setStatusMsg(
        `Connected!\nActive backend: ${health.active_backend}\nLM Studio: ${lm}  Ollama: ${ol}`
      );
      setStatusOk(true);
    } catch (e: any) {
      setStatusMsg(`Connection failed: ${e.message}`);
      setStatusOk(false);
    } finally {
      setTesting(false);
    }
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Server Connection</Text>

        <Text style={styles.label}>PC Server IP / Hostname</Text>
        <TextInput
          style={styles.input}
          value={settings.serverHost}
          onChangeText={(v) => setSettings((s) => ({ ...s, serverHost: v }))}
          placeholder="192.168.1.100"
          placeholderTextColor="#666"
          autoCapitalize="none"
          keyboardType="url"
        />

        <Text style={styles.label}>Port</Text>
        <TextInput
          style={styles.input}
          value={String(settings.serverPort)}
          onChangeText={(v) =>
            setSettings((s) => ({ ...s, serverPort: parseInt(v, 10) || 8080 }))
          }
          placeholder="8080"
          placeholderTextColor="#666"
          keyboardType="number-pad"
        />

        <Text style={styles.label}>Auth Token (optional)</Text>
        <TextInput
          style={styles.input}
          value={settings.authToken}
          onChangeText={(v) => setSettings((s) => ({ ...s, authToken: v }))}
          placeholder="Leave blank if not set"
          placeholderTextColor="#666"
          secureTextEntry
          autoCapitalize="none"
        />

        <Text style={styles.heading}>Backend</Text>

        <View style={styles.backendRow}>
          <TouchableOpacity
            style={[
              styles.backendBtn,
              settings.backend === "lmstudio" && styles.backendBtnActive,
            ]}
            onPress={() => setSettings((s) => ({ ...s, backend: "lmstudio" as BackendType }))}
          >
            <Text
              style={[
                styles.backendBtnText,
                settings.backend === "lmstudio" && styles.backendBtnTextActive,
              ]}
            >
              LM Studio
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.backendBtn,
              settings.backend === "ollama" && styles.backendBtnActive,
            ]}
            onPress={() => setSettings((s) => ({ ...s, backend: "ollama" as BackendType }))}
          >
            <Text
              style={[
                styles.backendBtnText,
                settings.backend === "ollama" && styles.backendBtnTextActive,
              ]}
            >
              Ollama
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.testBtn} onPress={handleTest} disabled={testing}>
          {testing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.testBtnText}>Test Connection</Text>
          )}
        </TouchableOpacity>

        {statusMsg && (
          <Text style={[styles.status, statusOk ? styles.statusOk : styles.statusErr]}>
            {statusMsg}
          </Text>
        )}

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Save Settings</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const BLUE = "#4A90D9";
const GREEN = "#4CAF50";
const RED = "#F44336";
const BG = "#1a1a2e";
const CARD = "#16213e";
const TEXT = "#e0e0e0";
const LABEL = "#a0a0b0";

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: BG },
  container: { padding: 20, paddingBottom: 40 },
  heading: { color: TEXT, fontSize: 18, fontWeight: "700", marginTop: 24, marginBottom: 8 },
  label: { color: LABEL, fontSize: 13, marginBottom: 4, marginTop: 12 },
  input: {
    backgroundColor: CARD,
    color: TEXT,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#2a2a4e",
  },
  backendRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  backendBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#2a2a4e",
    alignItems: "center",
  },
  backendBtnActive: { borderColor: BLUE, backgroundColor: BLUE + "22" },
  backendBtnText: { color: LABEL, fontSize: 15, fontWeight: "600" },
  backendBtnTextActive: { color: BLUE },
  testBtn: {
    marginTop: 24,
    backgroundColor: CARD,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BLUE,
  },
  testBtnText: { color: BLUE, fontSize: 16, fontWeight: "600" },
  status: { marginTop: 12, fontSize: 13, lineHeight: 20, borderRadius: 6, padding: 10 },
  statusOk: { backgroundColor: GREEN + "22", color: GREEN },
  statusErr: { backgroundColor: RED + "22", color: RED },
  saveBtn: {
    marginTop: 28,
    backgroundColor: BLUE,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
