"use client";

import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/tracking/color-picker";
import { applyAccentColor } from "@/components/theme/accent-color-provider";
import { useAuthStore } from "@/stores/auth";
import { getPreferences, updatePreferences } from "@/lib/api/profile";
import { toast } from "sonner";

const DEFAULT_ACCENT_COLOR = "#FAFAFA";

export default function SettingsPage() {
  const { token, user, updateUser } = useAuthStore();
  const [accentColor, setAccentColor] = useState(user?.accentColor ?? DEFAULT_ACCENT_COLOR);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    getPreferences(token)
      .then((preferences) => setAccentColor(preferences.accentColor))
      .catch((error) => {
        console.error("Failed to load preferences:", error);
        toast.error("Erreur lors du chargement des paramètres");
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  useEffect(() => {
    applyAccentColor(accentColor);
    return () => applyAccentColor(user?.accentColor ?? DEFAULT_ACCENT_COLOR);
  }, [accentColor, user?.accentColor]);

  const handleSave = async () => {
    if (!token) return;
    setIsSaving(true);
    try {
      const preferences = await updatePreferences(token, { accentColor });
      updateUser({ accentColor: preferences.accentColor });
      toast.success("Couleur d’accentuation enregistrée");
    } catch (error) {
      console.error("Failed to update preferences:", error);
      toast.error("Erreur lors de l’enregistrement");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="pb-24">
      <PageHeader title="Paramètres" showBack />

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="mb-5">
          <h2 className="font-semibold">Apparence</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Personnalisez la couleur des boutons et éléments sélectionnés.
          </p>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Couleur d’accentuation</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{accentColor}</p>
          </div>
          <ColorPicker
            value={accentColor}
            onChange={setAccentColor}
            disabled={isLoading || isSaving}
          />
        </div>

        <div className="mt-6 flex gap-2">
          <Button
            variant="outline"
            onClick={() => setAccentColor(DEFAULT_ACCENT_COLOR)}
            disabled={isLoading || isSaving}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Réinitialiser
          </Button>
          <Button onClick={handleSave} disabled={isLoading || isSaving} className="flex-1">
            {isSaving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </section>
    </div>
  );
}
