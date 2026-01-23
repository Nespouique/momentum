"use client";

import { useRef, useCallback, useEffect } from "react";

export function useTimerAudio() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const isInitializedRef = useRef(false);

  // Initialize audio context (must be called after user interaction)
  const initAudio = useCallback(() => {
    if (!isInitializedRef.current && typeof window !== "undefined") {
      try {
        audioContextRef.current = new (window.AudioContext ||
          // @ts-expect-error - webkitAudioContext for Safari
          window.webkitAudioContext)();
        isInitializedRef.current = true;
      } catch (e) {
        console.warn("Failed to initialize AudioContext:", e);
      }
    }
  }, []);

  // Play a beep sound
  const playBeep = useCallback((frequency: number, duration: number) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    try {
      // Resume context if suspended (browser autoplay policy)
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = "sine";
      oscillator.frequency.value = frequency;

      // Fade out to avoid click
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration / 1000);
    } catch (e) {
      console.warn("Failed to play beep:", e);
    }
  }, []);

  // Play countdown beep based on remaining seconds
  const playCountdownBeep = useCallback(
    (secondsRemaining: number) => {
      if (secondsRemaining > 0 && secondsRemaining <= 5) {
        // Short beep at 5, 4, 3, 2, 1 seconds
        playBeep(440, 100);
      } else if (secondsRemaining === 0) {
        // Double long beep at 0 seconds
        playBeep(880, 300);
        setTimeout(() => playBeep(880, 300), 350);
      }
    },
    [playBeep]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    initAudio,
    playBeep,
    playCountdownBeep,
    isInitialized: isInitializedRef.current,
  };
}
