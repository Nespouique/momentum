"use client";

import { useRef, useCallback, useEffect } from "react";

/**
 * Send a notification via Service Worker (works on mobile Chrome)
 * with fallback to new Notification() for desktop browsers.
 */
function sendNotification(title: string, options?: NotificationOptions) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  // Prefer Service Worker registration (required for Android Chrome)
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready
      .then((reg) => {
        reg.showNotification(title, options);
      })
      .catch(() => {
        // Fallback to standard Notification API (desktop)
        try {
          new Notification(title, options);
        } catch {
          // Silently fail if not supported
        }
      });
  } else {
    try {
      new Notification(title, options);
    } catch {
      // Silently fail
    }
  }
}

export function useTimerAudio() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const isInitializedRef = useRef(false);
  const scheduledNotifRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize audio context and request notification permission (must be called after user interaction)
  const initAudio = useCallback(() => {
    if (!isInitializedRef.current && typeof window !== "undefined") {
      try {
        audioContextRef.current = new (window.AudioContext ||
          // @ts-expect-error - webkitAudioContext for Safari
          window.webkitAudioContext)();
        isInitializedRef.current = true;

        // Request notification permission for background alerts
        if ("Notification" in window && Notification.permission === "default") {
          Notification.requestPermission();
        }
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

        // Send notification if app is in background (for mobile/PWA)
        if (typeof document !== "undefined" && document.hidden) {
          sendNotification("Repos termine !", {
            body: "C'est reparti !",
            tag: "momentum-timer",
            requireInteraction: false,
          });
        }
      }
    },
    [playBeep]
  );

  /**
   * Schedule a notification to fire at a specific timestamp.
   * Uses setTimeout so the browser has a single scheduled callback
   * (better chance to fire in background than relying on setInterval ticks).
   */
  const scheduleNotification = useCallback((restEndAt: number) => {
    // Clear any previous scheduled notification
    if (scheduledNotifRef.current) {
      clearTimeout(scheduledNotifRef.current);
      scheduledNotifRef.current = null;
    }

    const delay = restEndAt - Date.now();
    if (delay <= 0) return;

    scheduledNotifRef.current = setTimeout(() => {
      scheduledNotifRef.current = null;
      // Only send notification if the tab is still hidden (user hasn't come back)
      if (typeof document !== "undefined" && document.hidden) {
        sendNotification("Repos termine !", {
          body: "C'est reparti !",
          tag: "momentum-timer",
          requireInteraction: false,
        });
      }
    }, delay);
  }, []);

  /** Cancel a previously scheduled notification (e.g. when rest is skipped). */
  const cancelScheduledNotification = useCallback(() => {
    if (scheduledNotifRef.current) {
      clearTimeout(scheduledNotifRef.current);
      scheduledNotifRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
      }
      if (scheduledNotifRef.current) {
        clearTimeout(scheduledNotifRef.current);
      }
    };
  }, []);

  return {
    initAudio,
    playBeep,
    playCountdownBeep,
    scheduleNotification,
    cancelScheduledNotification,
    isInitialized: isInitializedRef.current,
  };
}
