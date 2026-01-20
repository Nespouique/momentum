"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";
import { cn } from "@/lib/utils";

interface RestTimeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: number; // in seconds
  onChange: (value: number) => void;
  title?: string;
}

const PRESETS = [
  { label: "30s", value: 30 },
  { label: "1:00", value: 60 },
  { label: "1:30", value: 90 },
  { label: "2:00", value: 120 },
  { label: "3:00", value: 180 },
];

export function RestTimeDialog({
  open,
  onOpenChange,
  value,
  onChange,
  title = "Temps de repos",
}: RestTimeDialogProps) {
  const [minutes, setMinutes] = useState(Math.floor(value / 60));
  const [seconds, setSeconds] = useState(value % 60);

  // Sync internal state when value changes or dialog opens
  useEffect(() => {
    if (open) {
      setMinutes(Math.floor(value / 60));
      setSeconds(value % 60);
    }
  }, [value, open]);

  const handleConfirm = () => {
    const totalSeconds = minutes * 60 + seconds;
    onChange(totalSeconds);
    onOpenChange(false);
  };

  const handlePreset = (presetValue: number) => {
    setMinutes(Math.floor(presetValue / 60));
    setSeconds(presetValue % 60);
  };

  // Handle seconds change with rollover to minutes
  const handleSecondsChange = (newSeconds: number | null) => {
    if (newSeconds === null) {
      setSeconds(0);
      return;
    }

    if (newSeconds >= 60) {
      // Roll over to next minute
      if (minutes < 10) {
        setMinutes(minutes + 1);
        setSeconds(0);
      }
    } else if (newSeconds < 0) {
      // Roll back to previous minute only if we have minutes to spare
      if (minutes > 0) {
        setMinutes(minutes - 1);
        setSeconds(45);
      } else {
        setSeconds(0);
      }
    } else {
      setSeconds(newSeconds);
    }
  };

  const currentTotal = minutes * 60 + seconds;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* Time inputs */}
          <div className="flex items-start justify-center gap-3">
            <div className="text-center">
              <NumberInput
                value={minutes}
                onChange={(v) => setMinutes(v ?? 0)}
                min={0}
                max={10}
                step={1}
                className="w-28"
              />
              <span className="text-xs text-muted-foreground mt-1.5 block">min</span>
            </div>
            <span className="text-2xl font-bold text-muted-foreground h-9 flex items-center">:</span>
            <div className="text-center">
              <NumberInput
                value={seconds}
                onChange={handleSecondsChange}
                min={minutes === 0 ? 0 : undefined}
                step={15}
                className="w-28"
              />
              <span className="text-xs text-muted-foreground mt-1.5 block">sec</span>
            </div>
          </div>

          {/* Presets */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Raccourcis</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreset(preset.value)}
                  className={cn(
                    "flex-1 min-w-[50px]",
                    currentTotal === preset.value &&
                      "border-orange-500/50 bg-orange-500/10 text-orange-400"
                  )}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleConfirm}>
            Confirmer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
