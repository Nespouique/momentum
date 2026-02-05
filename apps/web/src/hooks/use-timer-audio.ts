"use client";

import { useRef, useCallback, useEffect } from "react";

/**
 * Send a message to the active service worker.
 * Tries navigator.serviceWorker.controller first (synchronous — critical for
 * visibilitychange:hidden where the page may freeze before a Promise resolves).
 * Falls back to navigator.serviceWorker.ready for first-load edge cases.
 */
function postToServiceWorker(message: Record<string, unknown>) {
  if (!("serviceWorker" in navigator)) return;

  // Synchronous path: works after first SW activation + clients.claim()
  const controller = navigator.serviceWorker.controller;
  if (controller) {
    controller.postMessage(message);
    return;
  }

  // Async fallback: first load before SW claims this client
  navigator.serviceWorker.ready
    .then((reg) => reg.active?.postMessage(message))
    .catch(() => {});
}

/**
 * Send a notification via Service Worker (works on mobile Chrome)
 * with fallback to new Notification() for desktop browsers.
 * Uses renotify: true to ensure a new alert even when replacing a same-tag notification.
 */
function sendNotification(title: string, options?: NotificationOptions) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const opts = { ...options, renotify: true };

  // Prefer Service Worker registration (required for Android Chrome)
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready
      .then((reg) => {
        reg.showNotification(title, opts);
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

        // Request notification permission (await it so permission is granted before first rest)
        if ("Notification" in window && Notification.permission === "default") {
          Notification.requestPermission().catch(() => {});
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
        // Background notification is handled by scheduleNotification() in the page
        // (no inline notification here to avoid late duplicates on mobile)
      }
    },
    [playBeep]
  );

  /**
   * Schedule a notification to fire at a specific timestamp.
   * Two mechanisms for reliability on mobile:
   *   1. setTimeout in page context (works when tab stays alive)
   *   2. Service Worker postMessage + waitUntil (survives tab throttling)
   */
  const scheduleNotification = useCallback((restEndAt: number) => {
    // Clear any previous scheduled notification
    if (scheduledNotifRef.current) {
      clearTimeout(scheduledNotifRef.current);
      scheduledNotifRef.current = null;
    }

    const delay = restEndAt - Date.now();
    if (delay <= 0) return;

    // Primary: schedule via Service Worker (more reliable when backgrounded)
    postToServiceWorker({
      type: "SCHEDULE_NOTIFICATION",
      restEndAt,
      title: "Repos terminé !",
      body: "C'est reparti !",
    });

    // Backup: page-context setTimeout (fires if SW didn't handle it)
    // No document.hidden check — tag "momentum-timer" + renotify deduplicates with SW notification
    scheduledNotifRef.current = setTimeout(() => {
      scheduledNotifRef.current = null;
      sendNotification("Repos terminé !", {
        body: "C'est reparti !",
        tag: "momentum-timer",
        requireInteraction: false,
      });
    }, delay);
  }, []);

  /** Cancel a previously scheduled notification (e.g. when rest is skipped). */
  const cancelScheduledNotification = useCallback(() => {
    if (scheduledNotifRef.current) {
      clearTimeout(scheduledNotifRef.current);
      scheduledNotifRef.current = null;
    }
    // Also cancel in the Service Worker
    postToServiceWorker({ type: "CANCEL_NOTIFICATION" });
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
      postToServiceWorker({ type: "CANCEL_NOTIFICATION" });
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
