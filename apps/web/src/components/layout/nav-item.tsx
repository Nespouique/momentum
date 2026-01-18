"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItemProps {
  href: string;
  icon: LucideIcon;
  label: string;
  variant?: "mobile" | "desktop";
}

export function NavItem({ href, icon: Icon, label, variant = "mobile" }: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  if (variant === "desktop") {
    return (
      <Link
        href={href}
        className={cn(
          "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
          isActive
            ? "bg-secondary text-foreground"
            : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
        )}
      >
        <Icon
          className={cn(
            "h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110",
            isActive && "text-accent-blue"
          )}
        />
        <span>{label}</span>
        {isActive && (
          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent-blue" />
        )}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "relative flex min-w-[64px] flex-col items-center justify-center gap-1 px-4 py-2 transition-colors duration-200",
        isActive ? "text-foreground" : "text-muted-foreground"
      )}
    >
      {isActive && (
        <span className="absolute -top-0.5 h-0.5 w-8 rounded-full bg-accent-blue" />
      )}
      <Icon
        className={cn(
          "h-5 w-5 transition-transform duration-200",
          isActive && "scale-110"
        )}
      />
      <span className="text-[10px] font-medium uppercase tracking-wider">
        {label}
      </span>
    </Link>
  );
}
