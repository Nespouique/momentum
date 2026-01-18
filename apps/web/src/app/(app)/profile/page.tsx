"use client";

import { useRouter } from "next/navigation";
import { Ruler, BarChart3, User, Settings, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/layout";
import { ProfileNavLink } from "@/components/profile/profile-nav-link";
import { useAuthStore } from "@/stores/auth";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  if (!user) {
    return null;
  }

  return (
    <div>
      <PageHeader title="Profile" />

      <div className="space-y-6">
        {/* User Info */}
        <div className="flex flex-col items-center py-6">
          <Avatar className="w-20 h-20 mb-4">
            <AvatarFallback className="text-2xl bg-secondary">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <h2 className="text-xl font-semibold">{user.name}</h2>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>

        <Separator />

        {/* Navigation Links */}
        <div className="space-y-2">
          <ProfileNavLink
            href="/profile/measurements"
            icon={Ruler}
            label="Measurements"
          />
          <ProfileNavLink
            href="/settings/trackables"
            icon={BarChart3}
            label="Tracking Config"
          />
          <ProfileNavLink
            href="/profile/edit"
            icon={User}
            label="Edit Profile"
          />
          <ProfileNavLink
            href="/settings"
            icon={Settings}
            label="Settings"
          />
        </div>

        <Separator />

        {/* Logout */}
        <Button
          variant="outline"
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}
