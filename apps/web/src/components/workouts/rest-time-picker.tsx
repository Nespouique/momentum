"use client";

import { useState } from "react";
import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRestTime } from "./types";
import { RestTimeDialog } from "./rest-time-dialog";

interface RestTimePickerProps {
  value: number; // in seconds
  onChange: (value: number) => void;
  className?: string;
}

export function RestTimePicker({ value, onChange, className }: RestTimePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Rest time separator */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "group w-full flex items-center gap-3 py-3",
          "transition-all duration-200",
          className
        )}
      >
        {/* Left line with gradient fade */}
        <div className="flex-1 h-px bg-linear-to-r from-transparent via-zinc-700/50 to-zinc-700/50 group-hover:via-zinc-600/60 group-hover:to-zinc-600/60 transition-colors" />

        {/* Center badge */}
        <div className={cn(
          "flex items-center gap-1.5 px-3 py-1",
          "rounded-full",
          "bg-zinc-800/60 border border-zinc-700/50",
          "text-zinc-500 text-xs",
          "group-hover:bg-zinc-800 group-hover:border-zinc-600 group-hover:text-zinc-400",
          "transition-all duration-200"
        )}>
          <Timer className="h-3 w-3" />
          <span className="font-medium">{formatRestTime(value)}</span>
        </div>

        {/* Right line with gradient fade */}
        <div className="flex-1 h-px bg-linear-to-l from-transparent via-zinc-700/50 to-zinc-700/50 group-hover:via-zinc-600/60 group-hover:to-zinc-600/60 transition-colors" />
      </button>

      {/* Time picker dialog */}
      <RestTimeDialog
        open={open}
        onOpenChange={setOpen}
        value={value}
        onChange={onChange}
      />
    </>
  );
}
