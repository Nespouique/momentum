"use client";

import { useState, useEffect } from "react";
import { HexColorPicker } from "react-colorful";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

export function ColorPicker({ value, onChange, disabled = false }: ColorPickerProps) {
  const [hexInput, setHexInput] = useState(value);

  useEffect(() => {
    setHexInput(value);
  }, [value]);

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (val && !val.startsWith("#")) val = "#" + val;
    setHexInput(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      onChange(val);
    }
  };

  const handlePickerChange = (color: string) => {
    setHexInput(color);
    onChange(color);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Choisir la couleur d’accentuation"
          disabled={disabled}
          className="h-9 w-9 shrink-0 rounded-md border border-border shadow-sm transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          style={{ backgroundColor: value }}
        />
      </PopoverTrigger>
      <PopoverContent className="w-[224px] p-3 space-y-3" align="end">
        <HexColorPicker color={value} onChange={handlePickerChange} />
        <Input
          value={hexInput}
          onChange={handleHexInputChange}
          maxLength={7}
          placeholder="#000000"
          className="h-8 w-full font-mono text-sm"
        />
      </PopoverContent>
    </Popover>
  );
}
