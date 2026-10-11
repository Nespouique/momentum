"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { addCalendarDays, getLocalDateKey } from "@/lib/daily-calendar";

export function useLocalDay() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [today, setToday] = useState<string | null>(null);
  const initialized = useRef(false);
  const latestToday = useRef<string | null>(null);

  useEffect(() => {
    let midnightTimer: ReturnType<typeof setTimeout>;

    const refreshToday = () => {
      const now = new Date();
      const currentLocalDay = getLocalDateKey(now);
      latestToday.current = currentLocalDay;
      setToday(currentLocalDay);
      if (!initialized.current) {
        initialized.current = true;
        setSelectedDate(currentLocalDay);
      }

      clearTimeout(midnightTimer);
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      midnightTimer = setTimeout(refreshToday, nextMidnight.getTime() - now.getTime() + 10);
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refreshToday();
    };

    refreshToday();
    window.addEventListener("focus", refreshToday);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      clearTimeout(midnightTimer);
      window.removeEventListener("focus", refreshToday);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
    // Initialization is deliberately browser-only; refreshing today's cap must not retarget selection.
  }, []);

  const navigate = useCallback((amount: -1 | 1) => {
    setSelectedDate((current) => {
      if (!current) return current;
      const next = addCalendarDays(current, amount);
      if (amount > 0 && latestToday.current !== null && next > latestToday.current) return current;
      return next;
    });
  }, []);

  return {
    selectedDate,
    today,
    previousDay: () => navigate(-1),
    nextDay: () => navigate(1),
    canNavigateNext: selectedDate !== null && today !== null && selectedDate < today,
  };
}
