"use client";

import * as React from "react";

interface MenuSectionProps {
  title: string;
  children: React.ReactNode;
}

function MenuSection({ title, children }: MenuSectionProps) {
  return (
    <div>
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1 mb-2">
        {title}
      </h3>
      <div className="rounded-xl border border-border/50 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

export { MenuSection };
export type { MenuSectionProps };
