"use client";

import { useState } from "react";
import { Pencil, Clock } from "lucide-react";
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
      {/* Rest time display block */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "w-full flex items-center justify-center gap-2 py-2 px-4",
          "rounded-lg border border-dashed border-zinc-700",
          "bg-zinc-900/30 text-zinc-400",
          "transition-all duration-200",
          "hover:border-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/30",
          className
        )}
      >
        <Pencil className="h-3.5 w-3.5" />
        <span className="text-sm">Repos</span>
        <span className="text-sm font-medium text-zinc-300 flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {formatRestTime(value)}
        </span>
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
