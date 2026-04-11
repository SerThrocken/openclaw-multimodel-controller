// Web Speech API TTS hook with free-tier char tracking
import { useCallback, useRef } from 'react';
import { useStore } from '../store';
import { FREE_TTS_CHAR_LIMIT } from '../constants';
import { useToast } from '../context/ToastContext';

export function useTTS() {
  const { settings, canUseTTS, recordTTSUsage } = useStore();
  const toast = useToast();
  const synthRef = useRef<SpeechSynthesis | null>(
    typeof window !== 'undefined' ? window.speechSynthesis : null
  );

  const speak = useCallback((text: string, onEnd?: () => void) => {
    const synth = synthRef.current;
    if (!synth) return;
    if (!canUseTTS(text.length)) {
      toast.warning(
        `Free TTS limit reached (${FREE_TTS_CHAR_LIMIT} chars/day). Unlock unlimited TTS with OpenClaw Pro ($5+/month on Patreon).`
      );
      return;
    }
    // Truncate for free users
    const allowed = settings.isPro ? text : text.slice(0, FREE_TTS_CHAR_LIMIT);
    synth.cancel();
    const utt = new SpeechSynthesisUtterance(allowed);
    utt.onend = () => onEnd?.();
    recordTTSUsage(allowed.length);
    synth.speak(utt);
  }, [settings.isPro, canUseTTS, recordTTSUsage, toast]);

  const stop = useCallback(() => {
    synthRef.current?.cancel();
  }, []);

  const isSpeaking = () => synthRef.current?.speaking ?? false;

  return { speak, stop, isSpeaking };
}
