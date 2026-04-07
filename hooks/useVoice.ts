import { useState, useCallback, useRef } from 'react';
import { playGreeting, stopSpeech, isSpeaking, playVoicePreview, SpeechOptions } from '../services/speechService';
import { VoiceStyle } from '../services/speechService';

export function useVoice() {
  const [speaking, setSpeaking] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const speak = useCallback(
    async (text: string, voiceStyle: VoiceStyle) => {
      setSpeaking(true);
      setDone(false);
      setError(null);

      await playGreeting(text, voiceStyle, {
        onStart: () => setSpeaking(true),
        onDone: () => {
          setSpeaking(false);
          setDone(true);
        },
        onError: (e) => {
          setSpeaking(false);
          setError(e);
        },
        onStopped: () => setSpeaking(false),
      });
    },
    []
  );

  const stop = useCallback(async () => {
    await stopSpeech();
    setSpeaking(false);
  }, []);

  const preview = useCallback(async (voiceStyle: VoiceStyle) => {
    setSpeaking(true);
    setDone(false);
    await playVoicePreview(voiceStyle);
    // Wait a bit then reset (expo-speech doesn't always fire callbacks for previews)
    setTimeout(() => setSpeaking(false), 3000);
  }, []);

  return {
    speaking,
    done,
    error,
    speak,
    stop,
    preview,
  };
}
