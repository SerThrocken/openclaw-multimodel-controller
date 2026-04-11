import React, { useEffect } from 'react';

export const OAuthCallbackPage: React.FC = () => {
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const token = params.get('access_token');
    const error = params.get('error');

    if (window.opener) {
      window.opener.postMessage(
        { type: 'GOOGLE_OAUTH_TOKEN', token, error },
        window.location.origin,
      );
      window.close();
    }
  }, []);

  return (
    <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
      <div className="text-center space-y-2">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-slate-400">Completing sign-in…</p>
      </div>
    </div>
  );
};
