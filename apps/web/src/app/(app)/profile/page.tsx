"use client";

import { useRouter } from "next/navigation";
import { Ruler, BarChart3, User, Settings, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MenuItem } from "@/components/ui/menu-item";
import { MenuSection } from "@/components/ui/menu-section";
import { PageHeader } from "@/components/layout";
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
    <div className="pb-8">
      <PageHeader title="Profil" />

      {/* User Header Card */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-b from-muted/30 to-transparent rounded-2xl" />
        <div className="relative flex flex-col items-center py-8 px-4">
          <Avatar className="h-24 w-24 mb-4 ring-4 ring-background shadow-xl">
            <AvatarFallback className="text-2xl font-semibold bg-gradient-to-br from-zinc-700 to-zinc-800 text-zinc-200">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <h2 className="text-xl font-semibold tracking-tight">{user.name}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
        </div>
      </div>

      {/* Menu Sections */}
      <div className="space-y-6">
        <MenuSection title="Mensurations & Progrès">
          <MenuItem
            href="/profile/measurements"
            icon={Ruler}
            label="Mensurations"
            description="Suivre le poids, les mesures & plus"
            isFirst
          />
          <MenuItem
            href="/settings/trackables"
            icon={BarChart3}
            label="Configuration du suivi"
            description="Personnaliser ce que vous suivez"
            isLast
          />
        </MenuSection>

        <MenuSection title="Compte">
          <MenuItem
            href="/profile/edit"
            icon={User}
            label="Modifier le profil"
            description="Nom, âge, taille & objectifs"
            isFirst
          />
          <MenuItem
            href="/settings"
            icon={Settings}
            label="Paramètres"
            description="Préférences de l'application"
            isLast
          />
        </MenuSection>
      </div>

      {/* Logout Button */}
      <div className="mt-8 px-1">
        <Button
          variant="ghost"
          className="w-full h-12 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl border border-border/50"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Déconnexion
        </Button>
      </div>
    </div>
  );
}
