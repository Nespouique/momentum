"use client";

import { Home, Dumbbell, TrendingUp, User } from "lucide-react";
import { NavItem } from "./nav-item";

const navItems = [
  { href: "/", icon: Home, label: "Today" },
  { href: "/workouts", icon: Dumbbell, label: "Workouts" },
  { href: "/progress", icon: TrendingUp, label: "Progress" },
  { href: "/profile", icon: User, label: "Profile" },
];

export function MobileBottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 border-t border-border bg-background/80 backdrop-blur-xl lg:hidden">
      <div className="flex h-full items-center justify-around">
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            variant="mobile"
          />
        ))}
      </div>
      {/* Safe area for iOS */}
      <div className="h-safe-area-inset-bottom bg-background/80" />
    </nav>
  );
}
