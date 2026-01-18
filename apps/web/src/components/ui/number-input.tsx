"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value?: number | null;
  onChange?: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      className,
      value,
      onChange,
      min,
      max,
      step = 1,
      disabled,
      placeholder,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = React.useState<string>(
      value?.toString() ?? ""
    );

    React.useEffect(() => {
      setInternalValue(value?.toString() ?? "");
    }, [value]);

    const updateValue = (newValue: number | null) => {
      if (newValue === null) {
        setInternalValue("");
        onChange?.(null);
        return;
      }

      let clampedValue = newValue;
      if (min !== undefined) clampedValue = Math.max(min, clampedValue);
      if (max !== undefined) clampedValue = Math.min(max, clampedValue);

      setInternalValue(clampedValue.toString());
      onChange?.(clampedValue);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setInternalValue(val);

      if (val === "" || val === "-") {
        onChange?.(null);
        return;
      }

      const parsed = parseFloat(val);
      if (!isNaN(parsed)) {
        onChange?.(parsed);
      }
    };

    const handleBlur = () => {
      if (internalValue === "" || internalValue === "-") {
        onChange?.(null);
        return;
      }

      const parsed = parseFloat(internalValue);
      if (!isNaN(parsed)) {
        updateValue(parsed);
      }
    };

    const getBaseValue = (): number => {
      // Use current value if set
      if (value !== null && value !== undefined) {
        return value;
      }
      // Try to parse the internal value (what's displayed)
      const parsed = parseFloat(internalValue);
      if (!isNaN(parsed)) {
        return parsed;
      }
      // Fall back to placeholder value
      if (placeholder) {
        const placeholderValue = parseFloat(placeholder.toString());
        if (!isNaN(placeholderValue)) {
          return placeholderValue;
        }
      }
      // Last resort: use min or 0
      return min ?? 0;
    };

    const increment = () => {
      updateValue(getBaseValue() + step);
    };

    const decrement = () => {
      updateValue(getBaseValue() - step);
    };

    const baseValue = getBaseValue();
    const canDecrement = min === undefined || baseValue > min;
    const canIncrement = max === undefined || baseValue < max;

    return (
      <div
        className={cn(
          "flex h-9 w-full items-center rounded-md border border-input bg-background",
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        <button
          type="button"
          onClick={decrement}
          disabled={disabled || !canDecrement}
          className={cn(
            "flex h-full w-8 shrink-0 items-center justify-center border-r border-input",
            "text-muted-foreground transition-colors",
            "hover:bg-muted hover:text-foreground",
            "disabled:pointer-events-none disabled:opacity-50"
          )}
          tabIndex={-1}
        >
          <Minus className="h-3.5 w-3.5" />
        </button>

        <input
          type="text"
          inputMode="decimal"
          ref={ref}
          value={internalValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={placeholder?.toString()}
          className={cn(
            "min-w-0 flex-1 h-full bg-transparent px-2 py-1.5 text-center tabular-nums",
            "focus:outline-none disabled:cursor-not-allowed"
          )}
          {...props}
        />

        <button
          type="button"
          onClick={increment}
          disabled={disabled || !canIncrement}
          className={cn(
            "flex h-full w-8 shrink-0 items-center justify-center border-l border-input",
            "text-muted-foreground transition-colors",
            "hover:bg-muted hover:text-foreground",
            "disabled:pointer-events-none disabled:opacity-50"
          )}
          tabIndex={-1}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }
);

NumberInput.displayName = "NumberInput";

export { NumberInput };
