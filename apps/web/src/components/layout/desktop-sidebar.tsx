"use client";

import Link from "next/link";
import { Home, Dumbbell, Library, User } from "lucide-react";
import { NavItem } from "./nav-item";
import { useAuthStore } from "@/stores/auth";

const navItems = [
  { href: "/", icon: Home, label: "Accueil" },
  { href: "/workouts", icon: Dumbbell, label: "Séances" },
  { href: "/exercises", icon: Library, label: "Exercices" },
  { href: "/profile", icon: User, label: "Profil" },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function DesktopSidebar() {
  const user = useAuthStore((state) => state.user);

  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-60 flex-col border-r border-border bg-background lg:flex">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-border px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent-blue to-accent-blue/50">
            <span className="text-sm font-bold text-background">M</span>
          </div>
          <span className="text-lg font-semibold tracking-tight">
            MOMENTUM
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            variant="desktop"
          />
        ))}
      </nav>

      {/* User section */}
      <div className="border-t border-border p-4">
        <Link
          href="/profile"
          className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-medium">
            {user ? getInitials(user.name) : "U"}
          </div>
          <div className="flex-1 truncate">
            <p className="truncate text-sm font-medium">
              {user?.name || "User"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              View profile
            </p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
