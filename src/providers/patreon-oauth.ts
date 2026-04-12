/**
 * Patreon OAuth helper for Openclaw Pro verification.
 * Uses the Python backend /pro/oauth/start → /pro/oauth/callback flow.
 * If the backend is not running, falls back to direct Patreon link.
 */

const BACKEND_BASE = 'http://localhost:7860';
const OAUTH_TIMEOUT_MS = 5 * 60 * 1000;

export async function startPatreonOAuth(isCreator = false): Promise<void> {
  try {
    const url = `${BACKEND_BASE}/pro/oauth/start${isCreator ? '?creator=1' : ''}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    const popup = window.open(data.url, 'patreon-oauth', 'width=560,height=640,scrollbars=yes');
    if (!popup) throw new Error('Popup blocked. Allow popups for this site.');
    return new Promise((resolve, reject) => {
      const onMsg = (ev: MessageEvent) => {
        if (ev.origin !== window.location.origin) return;
        if (ev.data?.type === 'patreon_oauth_success') {
          window.removeEventListener('message', onMsg);
          resolve();
        } else if (ev.data?.type === 'patreon_oauth_error') {
          window.removeEventListener('message', onMsg);
          reject(new Error(ev.data.message || 'Patreon OAuth failed'));
        }
      };
      window.addEventListener('message', onMsg);
      setTimeout(() => {
        window.removeEventListener('message', onMsg);
        reject(new Error('OAuth timed out.'));
      }, OAUTH_TIMEOUT_MS);
    });
  } catch (e) {
    // Backend not running – open Patreon directly
    window.open('https://patreon.com/TLG3D', '_blank');
    throw new Error('Backend not running. Opened Patreon in a new tab. Please donate and click "I\'ve donated" to unlock Pro.');
  }
}

export async function checkProStatus(): Promise<{ isPro: boolean; name?: string }> {
  try {
    const res = await fetch(`${BACKEND_BASE}/pro/status`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return { isPro: false };
    const data = await res.json();
    return { isPro: !!data.is_pro, name: data.name };
  } catch {
    return { isPro: false };
  }
}
