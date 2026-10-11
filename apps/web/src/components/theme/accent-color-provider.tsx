"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth";

const DEFAULT_ACCENT_COLOR = "#FAFAFA";

function getRelativeLuminance(hexColor: string): number {
  const channels = [1, 3, 5].map((start) => {
    const value = Number.parseInt(hexColor.slice(start, start + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

function getContrastColor(hexColor: string): string {
  const backgroundLuminance = getRelativeLuminance(hexColor);
  const darkColor = "#000000";
  const lightColor = "#FFFFFF";
  const darkContrast = (backgroundLuminance + 0.05) / (getRelativeLuminance(darkColor) + 0.05);
  const lightContrast = (getRelativeLuminance(lightColor) + 0.05) / (backgroundLuminance + 0.05);

  return darkContrast >= lightContrast ? darkColor : lightColor;
}

export function applyAccentColor(color: string): void {
  if (typeof document === "undefined") return;
  const safeColor = /^#[0-9A-Fa-f]{6}$/.test(color) ? color : DEFAULT_ACCENT_COLOR;
  const root = document.documentElement;
  root.style.setProperty("--primary", safeColor);
  root.style.setProperty("--primary-foreground", getContrastColor(safeColor));
  root.style.setProperty("--ring", safeColor);
}

export function AccentColorProvider({ children }: { children: React.ReactNode }) {
  const accentColor = useAuthStore((state) => state.user?.accentColor);

  useEffect(() => {
    applyAccentColor(accentColor ?? DEFAULT_ACCENT_COLOR);
  }, [accentColor]);

  return children;
}
