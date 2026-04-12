import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { ChatPage } from './components/chat/ChatPage';
import { ConnectionsPage } from './components/connections/ConnectionsPage';
import { SettingsPage } from './components/settings/SettingsPage';
import { HistoryPage } from './components/history/HistoryPage';
import { SkillsPage } from './components/skills/SkillsPage';
import { MemoryBankPage } from './components/memory/MemoryBankPage';
import { ToastProvider } from './context/ToastContext';
import { WelcomeScreen } from './components/onboarding/WelcomeScreen';
import { OAuthCallbackPage } from './components/onboarding/OAuthCallbackPage';
import { useStore } from './store';

function AppInner() {
  const providers = useStore(s => s.providers);
  const [welcomeDismissed, setWelcomeDismissed] = useState(() =>
    localStorage.getItem('oc_welcomed') === '1'
  );

  const handleWelcomeDismiss = () => {
    localStorage.setItem('oc_welcomed', '1');
    setWelcomeDismissed(true);
  };

  const showWelcome = !welcomeDismissed && providers.length === 0;

  return (
    <>
      {showWelcome && <WelcomeScreen onDismiss={handleWelcomeDismiss} />}
      <Routes>
        <Route path="/oauth-callback" element={<OAuthCallbackPage />} />
        <Route element={<Layout />}>
          <Route path="/" element={<ChatPage />} />
          <Route path="/connections" element={<ConnectionsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/skills" element={<SkillsPage />} />
          <Route path="/memory" element={<MemoryBankPage />} />
        </Route>
      </Routes>
    </>
  );
}

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <AppInner />
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
