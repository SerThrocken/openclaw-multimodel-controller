/**
 * Opens a Google OAuth 2.0 implicit-flow popup.
 * Requires the user to have configured a Google OAuth Client ID in Settings
 * (stored in AppSettings.googleClientId).
 *
 * After the user signs in, the access token is extracted from the redirect URL
 * hash and returned. The token can then be stored as the provider's `apiKey`.
 *
 * Gemini API accepts `Authorization: Bearer <access_token>` when the token is
 * a valid Google OAuth token with the `https://www.googleapis.com/auth/generative-language` scope.
 */

const GOOGLE_OAUTH_SCOPE =
  'https://www.googleapis.com/auth/generative-language openid email profile';

export function isOAuthToken(token: string): boolean {
  // Google OAuth tokens start with "ya29." or are long JWTs (id tokens start with "eyJ")
  return token.startsWith('ya29.') || token.startsWith('eyJ');
}

export async function startGoogleOAuth(clientId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const redirectUri = `${window.location.origin}/oauth-callback`;
    const params = new URLSearchParams({
      client_id:     clientId,
      redirect_uri:  redirectUri,
      response_type: 'token',
      scope:         GOOGLE_OAUTH_SCOPE,
      prompt:        'consent',
    });

    const url    = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    const popup  = window.open(url, 'google-oauth', 'width=520,height=620,scrollbars=yes');
    if (!popup) { reject(new Error('Popup blocked. Allow popups for this site.')); return; }

    const onMsg = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'GOOGLE_OAUTH_TOKEN') {
        window.removeEventListener('message', onMsg);
        if (event.data.token) resolve(event.data.token);
        else reject(new Error(event.data.error || 'OAuth failed'));
      }
    };
    window.addEventListener('message', onMsg);

    // Timeout after 5 minutes
    setTimeout(() => {
      window.removeEventListener('message', onMsg);
      reject(new Error('OAuth timed out.'));
    }, 5 * 60 * 1000);
  });
}
