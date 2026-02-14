"use client";

import { useState, useMemo, useEffect } from "react";
import { X, ExternalLink, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getIconComponent } from "@/lib/icons";
import { cn } from "@/lib/utils";

interface IconSelectorProps {
  value: string;
  onChange: (icon: string) => void;
  suggestions?: string[];
  suggestionsLoading?: boolean;
}

export function IconSelector({
  value,
  onChange,
  suggestions,
  suggestionsLoading,
}: IconSelectorProps) {
  const [inputValue, setInputValue] = useState(value || "");

  // Sync inputValue when value changes externally (e.g. AI auto-select)
  useEffect(() => {
    if (value && value !== inputValue) {
      setInputValue(value);
    }
  }, [value]);

  const resolvedIcon = useMemo(() => {
    if (!inputValue) return null;
    return getIconComponent(inputValue);
  }, [inputValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setInputValue(val);
    // Only commit valid icons to form state
    const icon = getIconComponent(val);
    if (icon) {
      onChange(val);
    }
  };

  const handleClear = () => {
    setInputValue("");
    onChange("");
  };

  const handleSuggestionClick = (iconName: string) => {
    setInputValue(iconName);
    onChange(iconName);
  };

  // Resolve suggestion icons
  const resolvedSuggestions = useMemo(() => {
    if (!suggestions) return [];
    return suggestions
      .map((name) => ({ name, component: getIconComponent(name) }))
      .filter((s) => s.component !== null)
      .slice(0, 5);
  }, [suggestions]);

  // Border is red when there's text typed but it doesn't resolve to a valid icon
  const hasInvalidInput = inputValue.length > 0 && !resolvedIcon;

  return (
    <div className="space-y-3">
      {/* AI Suggestions */}
      {suggestionsLoading && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Suggestions en cours...</span>
        </div>
      )}
      {resolvedSuggestions.length > 0 && (
        <div className="flex justify-between">
          {resolvedSuggestions.map(({ name, component: SugIcon }) => {
            if (!SugIcon) return null;
            const isSelected = value === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => handleSuggestionClick(name)}
                className={cn(
                  "h-10 w-10 flex items-center justify-center rounded-lg border transition-all",
                  "hover:bg-muted/50 hover:border-foreground/20",
                  isSelected
                    ? "bg-foreground/5 border-foreground/30 ring-1 ring-foreground/20"
                    : "bg-background border-border/50"
                )}
                title={name}
              >
                <SugIcon className="w-5 h-5" />
              </button>
            );
          })}
        </div>
      )}

      {/* Text input with clear button */}
      <div className="relative">
        <Input
          type="text"
          placeholder="dumbbell, heart, flower-lotus..."
          value={inputValue}
          onChange={handleInputChange}
          className={cn(
            "h-9 bg-muted/50 pr-8",
            hasInvalidInput
              ? "border-red-500 focus-visible:ring-red-500/30"
              : "border-border/50"
          )}
        />
        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <a
        href="https://lucide.dev/icons"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        Parcourir les icônes sur lucide.dev
        <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}
