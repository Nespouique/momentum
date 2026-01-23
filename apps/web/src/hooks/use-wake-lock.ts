"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * Hook to request Wake Lock API to prevent screen from sleeping during workout sessions.
 * Falls back gracefully on unsupported browsers.
 */
export function useWakeLock(enabled: boolean) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const requestWakeLock = useCallback(async () => {
    if (!("wakeLock" in navigator)) {
      console.log("Wake Lock API not supported");
      return;
    }

    try {
      wakeLockRef.current = await navigator.wakeLock.request("screen");
      console.log("Wake Lock is active");

      // Handle visibility change - re-acquire lock when page becomes visible
      wakeLockRef.current.addEventListener("release", () => {
        console.log("Wake Lock was released");
      });
    } catch (err) {
      console.error("Failed to acquire Wake Lock:", err);
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        console.log("Wake Lock released");
      } catch (err) {
        console.error("Failed to release Wake Lock:", err);
      }
    }
  }, []);

  // Handle visibility change - re-acquire when page becomes visible
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible" && enabled) {
        await requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, requestWakeLock]);

  // Acquire/release based on enabled state
  useEffect(() => {
    if (enabled) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    return () => {
      releaseWakeLock();
    };
  }, [enabled, requestWakeLock, releaseWakeLock]);

  return {
    isSupported: typeof navigator !== "undefined" && "wakeLock" in navigator,
    isActive: !!wakeLockRef.current,
  };
}
