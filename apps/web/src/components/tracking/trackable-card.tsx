"use client";

import { useState } from "react";
import { Check, Circle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { getIconComponent } from "@/lib/icons";
import { cn } from "@/lib/utils";

interface DashboardTrackable {
  id: string;
  name: string;
  icon: string;
  color: string;
  trackingType: "boolean" | "number" | "duration";
  unit: string | null;
  goal: {
    targetValue: number;
    frequency: "daily" | "weekly" | "monthly";
  } | null;
  entry: {
    id: string;
    value: number;
    source: "manual" | "health_connect";
  } | null;
  completed: boolean;
}

interface TrackableCardProps {
  trackable: DashboardTrackable;
  onToggle: (trackableId: string, value: number) => Promise<void>;
  onUpdate: (trackableId: string, value: number) => Promise<void>;
}

function getIcon(iconName: string) {
  return getIconComponent(iconName) || Circle;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h${mins.toString().padStart(2, "0")}`;
}

function formatFrequency(frequency: string): string {
  const map: Record<string, string> = {
    daily: "jour",
    weekly: "semaine",
    monthly: "mois",
  };
  return map[frequency] || frequency;
}

export function TrackableCard({
  trackable,
  onToggle,
  onUpdate,
}: TrackableCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(
    trackable.entry?.value.toString() || ""
  );
  const [isUpdating, setIsUpdating] = useState(false);

  const Icon = getIcon(trackable.icon);
  const isCompleted = trackable.completed;

  const handleBooleanToggle = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      const newValue = isCompleted ? 0 : 1;
      await onToggle(trackable.id, newValue);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleNumberClick = () => {
    if (!isEditing) {
      setIsEditing(true);
      setInputValue(trackable.entry?.value.toString() || "");
    }
  };

  const handleInputSubmit = async () => {
    if (!inputValue.trim()) {
      setIsEditing(false);
      return;
    }

    const value = parseInt(inputValue, 10);
    if (isNaN(value) || value < 0) {
      setIsEditing(false);
      return;
    }

    setIsUpdating(true);
    try {
      await onUpdate(trackable.id, value);
      setIsEditing(false);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleInputSubmit();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setInputValue(trackable.entry?.value.toString() || "");
    }
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border/40 bg-card transition-all duration-300",
        isCompleted && "opacity-60"
      )}
      style={{
        borderLeftWidth: "4px",
        borderLeftColor: trackable.color,
      }}
    >
      {/* Subtle accent glow */}
      <div
        className="absolute inset-y-0 left-0 w-12 opacity-5 blur-xl"
        style={{ backgroundColor: trackable.color }}
      />

      <div className="relative p-4">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-all duration-300",
              isCompleted && "opacity-50"
            )}
            style={{
              backgroundColor: `${trackable.color}15`,
            }}
          >
            <Icon className="h-5 w-5" style={{ color: trackable.color }} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3
                className={cn(
                  "text-sm font-semibold tracking-tight transition-all duration-300",
                  isCompleted && "line-through text-muted-foreground"
                )}
              >
                {trackable.name}
              </h3>
              {isCompleted && (
                <div
                  className="flex h-5 w-5 items-center justify-center rounded-full transition-all duration-300"
                  style={{ backgroundColor: `${trackable.color}20` }}
                >
                  <Check
                    className="h-3 w-3"
                    style={{ color: trackable.color }}
                  />
                </div>
              )}
            </div>
            {trackable.goal && (
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                {trackable.trackingType === "duration" && !trackable.unit
                  ? formatDuration(trackable.goal.targetValue)
                  : trackable.goal.targetValue}
                {trackable.unit && ` ${trackable.unit}`} /{" "}
                {formatFrequency(trackable.goal.frequency)}
              </p>
            )}
          </div>

          {/* Interaction */}
          <div className="shrink-0">
            {trackable.trackingType === "boolean" ? (
              <Checkbox
                checked={isCompleted}
                onCheckedChange={handleBooleanToggle}
                disabled={isUpdating}
                className="h-6 w-6 transition-all duration-200 hover:scale-110 active:scale-95"
                style={
                  {
                    "--checkbox-color": trackable.color,
                  } as React.CSSProperties
                }
              />
            ) : isEditing ? (
              <Input
                type="number"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onBlur={handleInputSubmit}
                onKeyDown={handleInputKeyDown}
                autoFocus
                className="h-9 w-20 text-right tabular-nums"
                disabled={isUpdating}
              />
            ) : (
              <button
                onClick={handleNumberClick}
                disabled={isUpdating}
                className={cn(
                  "flex h-9 min-w-[60px] items-center justify-center rounded-lg border border-border/40 bg-secondary/30 px-3 text-sm font-semibold tabular-nums transition-all duration-200",
                  "hover:bg-secondary/50 active:scale-95 cursor-pointer"
                )}
              >
                {trackable.entry ? (
                  <span>
                    {trackable.trackingType === "duration" && !trackable.unit
                      ? formatDuration(trackable.entry.value)
                      : trackable.entry.value}
                    {trackable.unit && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        {trackable.unit}
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Completion overlay */}
      {isCompleted && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-background/5 to-transparent pointer-events-none" />
      )}
    </div>
  );
}
