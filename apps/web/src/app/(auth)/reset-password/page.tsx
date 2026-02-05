"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";

import {
  resetPasswordSchema,
  ResetPasswordFormData,
} from "@/lib/validations/auth";
import { resetPassword } from "@/lib/api/auth";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) return;
    try {
      setError(null);
      await resetPassword(token, data.password);
      setSuccess(true);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Une erreur est survenue. Veuillez réessayer.");
      }
    }
  };

  // No token in URL
  if (!token) {
    return (
      <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-xs">
        <CardHeader className="space-y-1 text-center pb-8">
          <div className="mx-auto mb-4">
            <h1 className="text-3xl font-bold tracking-tight">MOMENTUM</h1>
          </div>
          <CardTitle className="text-xl">Lien invalide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Ce lien de réinitialisation est invalide. Veuillez demander un
            nouveau lien.
          </p>
          <div className="flex flex-col items-center gap-3">
            <Link href="/forgot-password">
              <Button variant="outline">Demander un nouveau lien</Button>
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour à la connexion
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-xs">
      <CardHeader className="space-y-1 text-center pb-8">
        <div className="mx-auto mb-4">
          <h1 className="text-3xl font-bold tracking-tight">MOMENTUM</h1>
        </div>
        <CardTitle className="text-xl">
          {success ? "Mot de passe réinitialisé" : "Nouveau mot de passe"}
        </CardTitle>
        <CardDescription>
          {success
            ? "Vous pouvez maintenant vous connecter"
            : "Choisissez un nouveau mot de passe"}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {success ? (
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="rounded-full bg-green-500/10 p-3">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Votre mot de passe a été réinitialisé avec succès.
            </p>
            <div className="text-center">
              <Link href="/login">
                <Button className="w-full h-11">Se connecter</Button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error}
                  <Link
                    href="/forgot-password"
                    className="block mt-2 underline"
                  >
                    Demander un nouveau lien
                  </Link>
                </AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nouveau mot de passe</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Minimum 8 caractères"
                          autoComplete="new-password"
                          className="h-11"
                          disabled={form.formState.isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmer le mot de passe</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Retapez le mot de passe"
                          autoComplete="new-password"
                          className="h-11"
                          disabled={form.formState.isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-11 mt-2"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Réinitialisation...
                    </>
                  ) : (
                    "Réinitialiser le mot de passe"
                  )}
                </Button>
              </form>
            </Form>

            <div className="text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary hover:underline"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour à la connexion
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
