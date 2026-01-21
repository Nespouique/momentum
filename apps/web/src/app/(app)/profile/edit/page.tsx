"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2, AlertCircle, Lock, CalendarIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from "@/components/layout";
import { cn } from "@/lib/utils";

import {
  updateProfileSchema,
  changePasswordSchema,
  UpdateProfileFormData,
  ChangePasswordFormData,
} from "@/lib/validations/profile";
import { getProfile, updateProfile, changePassword } from "@/lib/api/profile";
import { useAuthStore } from "@/stores/auth";

export default function EditProfilePage() {
  const { token, user, checkAuth } = useAuthStore();
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const profileForm = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: "",
      birthDate: null,
      height: null,
      goalDescription: "",
    },
  });

  const passwordForm = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  // Load profile data
  useEffect(() => {
    async function loadProfile() {
      if (!token) return;

      try {
        const profile = await getProfile(token);
        profileForm.reset({
          name: profile.name,
          birthDate: profile.birthDate,
          height: profile.height,
          goalDescription: profile.goalDescription || "",
        });
      } catch (err) {
        setProfileError(err instanceof Error ? err.message : "Erreur lors du chargement du profil");
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, [token, profileForm]);

  const onProfileSubmit = async (data: UpdateProfileFormData) => {
    if (!token) return;

    try {
      setProfileError(null);
      await updateProfile(token, {
        name: data.name,
        birthDate: data.birthDate ?? null,
        height: data.height ?? null,
        goalDescription: data.goalDescription || null,
      });
      await checkAuth();
      toast.success("Profil mis à jour avec succès");
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Erreur lors de la mise à jour du profil");
    }
  };

  const onPasswordSubmit = async (data: ChangePasswordFormData) => {
    if (!token) return;

    try {
      setPasswordError(null);
      await changePassword(token, {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      passwordForm.reset();
      toast.success("Mot de passe modifié avec succès");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Erreur lors du changement de mot de passe");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Modifier le profil" showBack />

      <div className="space-y-6">
        {/* Profile Form */}
        <Card>
          <CardHeader>
            <CardTitle>Informations</CardTitle>
          </CardHeader>
          <CardContent>
            {profileError && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{profileError}</AlertDescription>
              </Alert>
            )}

            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                <FormField
                  control={profileForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Votre nom"
                          disabled={profileForm.formState.isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">Email</label>
                  <Input value={user?.email || ""} disabled className="bg-muted" />
                  <p className="text-sm text-muted-foreground">L'email ne peut pas être modifié</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={profileForm.control}
                    name="birthDate"
                    render={({ field }) => {
                      // Handle both ISO format (from API) and date-only format
                      const parseDate = (value: string | null | undefined) => {
                        if (!value || typeof value !== "string") return undefined;
                        // If already ISO format, use directly; otherwise add time component
                        const dateStr = value.includes("T") ? value : value + "T00:00:00";
                        return new Date(dateStr);
                      };
                      const dateValue = parseDate(field.value);
                      const isValidDate = dateValue && !isNaN(dateValue.getTime());

                      return (
                        <FormItem>
                          <FormLabel>Date de naissance</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-center sm:justify-start text-left font-normal",
                                    !isValidDate && "text-muted-foreground"
                                  )}
                                  disabled={profileForm.formState.isSubmitting}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {isValidDate
                                    ? format(dateValue, "d MMMM yyyy", { locale: fr })
                                    : "Sélectionner"}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                locale={fr}
                                weekStartsOn={1}
                                selected={isValidDate ? dateValue : undefined}
                                onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : null)}
                                disabled={(date) => date > new Date()}
                                initialFocus
                                captionLayout="dropdown"
                                fromYear={1920}
                                toYear={new Date().getFullYear()}
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  <FormField
                    control={profileForm.control}
                    name="height"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Taille (cm)</FormLabel>
                        <FormControl>
                          <NumberInput
                            min={50}
                            max={300}
                            step={1}
                            placeholder="175"
                            disabled={profileForm.formState.isSubmitting}
                            value={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={profileForm.control}
                  name="goalDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Objectifs</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Décrivez vos objectifs de fitness..."
                          className="resize-none"
                          rows={3}
                          disabled={profileForm.formState.isSubmitting}
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={profileForm.formState.isSubmitting}
                >
                  {profileForm.formState.isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    "Enregistrer les modifications"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Separator />

        {/* Change Password Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Changer le mot de passe
            </CardTitle>
          </CardHeader>
          <CardContent>
            {passwordError && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{passwordError}</AlertDescription>
              </Alert>
            )}

            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mot de passe actuel</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Entrez le mot de passe actuel"
                          autoComplete="current-password"
                          disabled={passwordForm.formState.isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nouveau mot de passe</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Entrez le nouveau mot de passe"
                          autoComplete="new-password"
                          disabled={passwordForm.formState.isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="confirmNewPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmer le nouveau mot de passe</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Confirmez le nouveau mot de passe"
                          autoComplete="new-password"
                          disabled={passwordForm.formState.isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  variant="secondary"
                  className="w-full"
                  disabled={passwordForm.formState.isSubmitting}
                >
                  {passwordForm.formState.isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Changement du mot de passe...
                    </>
                  ) : (
                    "Changer le mot de passe"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
