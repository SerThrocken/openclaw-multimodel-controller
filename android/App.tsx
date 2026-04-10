/**
 * App.tsx — OpenClaw Android entry point
 *
 * Sets up React Navigation with a bottom tab navigator containing:
 *   💬 Chat     — send messages to the local AI
 *   📦 Models   — browse and select the active model
 *   ⚙️ Settings — configure server connection and backend
 */

import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "react-native";

import ChatScreen from "./src/screens/ChatScreen";
import ModelsScreen from "./src/screens/ModelsScreen";
import SettingsScreen from "./src/screens/SettingsScreen";

const Tab = createBottomTabNavigator();

const BG      = "#1a1a2e";
const SURFACE = "#16213e";
const BLUE    = "#4A90D9";
const MUTED   = "#a0a0b0";

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer
        theme={{
          dark: true,
          colors: {
            primary:        BLUE,
            background:     BG,
            card:           SURFACE,
            text:           "#e0e0e0",
            border:         "#2a2a4e",
            notification:   BLUE,
          },
        }}
      >
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerStyle:      { backgroundColor: SURFACE },
            headerTintColor:  "#e0e0e0",
            headerTitleStyle: { fontWeight: "700" },
            tabBarStyle:      { backgroundColor: SURFACE, borderTopColor: "#2a2a4e" },
            tabBarActiveTintColor:   BLUE,
            tabBarInactiveTintColor: MUTED,
            tabBarIcon: ({ color, size }) => {
              const icons: Record<string, string> = {
                Chat:     "💬",
                Models:   "📦",
                Settings: "⚙️",
              };
              return (
                <Text style={{ fontSize: size - 2 }}>
                  {icons[route.name] ?? "•"}
                </Text>
              );
            },
          })}
        >
          <Tab.Screen
            name="Chat"
            component={ChatScreen}
            options={{ title: "Chat" }}
          />
          <Tab.Screen
            name="Models"
            component={ModelsScreen}
            options={{ title: "Models" }}
          />
          <Tab.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ title: "Settings" }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
