"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MenuItemProps {
  href: string;
  icon: LucideIcon;
  label: string;
  description?: string;
  isFirst?: boolean;
  isLast?: boolean;
}

function MenuItem({ href, icon: Icon, label, description, isFirst, isLast }: MenuItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-4 px-4 py-3.5 bg-card/50 transition-colors hover:bg-muted/50",
        isFirst && "rounded-t-xl",
        isLast && "rounded-b-xl",
        !isLast && "border-b border-border/50"
      )}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/80">
        <Icon className="h-4.5 w-4.5 text-foreground/70" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
    </Link>
  );
}

export { MenuItem };
export type { MenuItemProps };
