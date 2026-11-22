"use client";

import { useCallback, useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { Check, Copy, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createMcpToken,
  listMcpConnections,
  McpConnectionsError,
  McpConnection,
  revokeMcpConnection,
} from "@/lib/api/mcp-connections";
import { useAuthStore } from "@/stores/auth";

const tokenFormSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "Le nom est obligatoire")
    .max(60, "Le nom ne peut pas dépasser 60 caractères"),
  expiresInDays: z.enum(["30", "90", "365", "never"]),
});

type TokenFormValues = z.infer<typeof tokenFormSchema>;

interface CreatedToken {
  token: string;
  mcpUrl: string;
}

function displayDate(value: string): string {
  return format(new Date(value), "d MMM yyyy", { locale: fr });
}

function displayLastUsed(value: string | null): string {
  if (!value) return "Jamais utilisée";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Jamais utilisée";
  return `Dernière utilisation : ${formatDistanceToNow(date, { addSuffix: true, locale: fr })}`;
}

function parseExpiry(value: TokenFormValues["expiresInDays"]): 30 | 90 | 365 | null {
  if (value === "never") return null;
  if (value === "30") return 30;
  if (value === "90") return 90;
  return 365;
}

async function copyToClipboard(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success("Copié");
  } catch (error) {
    console.error("Failed to copy MCP value:", error);
    toast.error("Impossible de copier dans le presse-papiers");
  }
}

function CopyButton({ value, label }: { value: string; label: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="min-h-11 shrink-0 gap-2"
      onClick={() => void copyToClipboard(value)}
      aria-label={label}
    >
      <Copy className="h-4 w-4" />
      Copier
    </Button>
  );
}

function McpConnectionRow({
  connection,
  onRevoke,
}: {
  connection: McpConnection;
  onRevoke: (connection: McpConnection) => void;
}) {
  const expired =
    connection.expiresAt !== null && new Date(connection.expiresAt).getTime() < Date.now();

  return (
    <li className="flex min-w-0 items-start justify-between gap-3 border-t border-border py-4 first:border-t-0">
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="break-words text-sm font-medium">{connection.label}</p>
          <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
            {connection.kind === "oauth" ? "OAuth" : "Jeton personnel"}
          </span>
        </div>
        {connection.kind === "oauth" &&
          connection.clientName &&
          connection.clientName !== connection.label && (
            <p className="break-words text-xs text-muted-foreground">
              Application : {connection.clientName}
            </p>
          )}
        {connection.kind === "personal_token" && connection.tokenPrefix && (
          <p className="break-all font-mono text-xs text-muted-foreground">
            {connection.tokenPrefix}…
          </p>
        )}
        <p className="text-xs text-muted-foreground">Créé le {displayDate(connection.createdAt)}</p>
        <p className="text-xs text-muted-foreground">{displayLastUsed(connection.lastUsedAt)}</p>
        {connection.kind === "personal_token" && (
          <p className={`text-xs ${expired ? "text-destructive" : "text-muted-foreground"}`}>
            {connection.expiresAt
              ? expired
                ? "Expiré"
                : `Expire le ${displayDate(connection.expiresAt)}`
              : "N'expire jamais"}
          </p>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-11 w-11 shrink-0 text-red-500 hover:bg-red-500/10 hover:text-red-400"
        title="Révoquer cet accès"
        aria-label={`Révoquer ${connection.label}`}
        onClick={() => onRevoke(connection)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </li>
  );
}

export function McpConnectionsSection() {
  const token = useAuthStore((state) => state.token);
  const [enabled, setEnabled] = useState(false);
  const [mcpUrl, setMcpUrl] = useState<string | null>(null);
  const [connections, setConnections] = useState<McpConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createdToken, setCreatedToken] = useState<CreatedToken | null>(null);
  const [connectionToRevoke, setConnectionToRevoke] = useState<McpConnection | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const form = useForm<TokenFormValues>({
    resolver: zodResolver(tokenFormSchema),
    defaultValues: { label: "", expiresInDays: "90" },
  });

  const loadConnections = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const result = await listMcpConnections(token);
      setEnabled(result.enabled);
      setMcpUrl(result.mcpUrl);
      setConnections(result.connections);
    } catch (error) {
      console.error("Failed to load MCP connections:", error);
      toast.error("Erreur lors du chargement des connexions MCP");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadConnections();
  }, [loadConnections]);

  const onCreateToken = async (values: TokenFormValues) => {
    if (!token) return;
    setIsCreating(true);

    try {
      const result = await createMcpToken(token, {
        label: values.label,
        expiresInDays: parseExpiry(values.expiresInDays),
      });
      setCreatedToken({ token: result.token, mcpUrl: result.mcpUrl });
      setMcpUrl(result.mcpUrl);
      setIsCreateOpen(false);
      form.reset({ label: "", expiresInDays: "90" });
      await loadConnections();
      toast.success("Jeton créé");
    } catch (error) {
      console.error("Failed to create MCP token:", error);
      if (error instanceof McpConnectionsError && error.code === "TOO_MANY_TOKENS") {
        toast.error("Vous avez atteint la limite de 20 jetons actifs");
      } else if (error instanceof McpConnectionsError && error.code === "MCP_NOT_CONFIGURED") {
        toast.error("Le serveur MCP n'est pas configuré sur ce serveur");
      } else {
        toast.error("Erreur lors de la création du jeton");
      }
    } finally {
      setIsCreating(false);
    }
  };

  const onRevoke = async () => {
    if (!token || !connectionToRevoke) return;
    setIsRevoking(true);

    try {
      await revokeMcpConnection(token, connectionToRevoke.id);
      setConnections((current) =>
        current.filter((connection) => connection.id !== connectionToRevoke.id)
      );
      setConnectionToRevoke(null);
      toast.success("Accès révoqué");
    } catch (error) {
      console.error("Failed to revoke MCP connection:", error);
      toast.error("Erreur lors de la révocation de l'accès");
    } finally {
      setIsRevoking(false);
    }
  };

  const opencodeConfig = createdToken
    ? JSON.stringify(
        {
          mcp: {
            momentum: {
              type: "remote",
              url: createdToken.mcpUrl,
              headers: { Authorization: `Bearer ${createdToken.token}` },
            },
          },
        },
        null,
        2
      )
    : "";
  const claudeCommand = createdToken
    ? `claude mcp add --transport http momentum ${createdToken.mcpUrl} --header "Authorization: Bearer ${createdToken.token}"`
    : "";

  return (
    <section className="mt-4 rounded-xl border border-border bg-card p-4">
      <div className="mb-5">
        <h2 className="font-semibold">Connexions MCP</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Connectez un LLM (ChatGPT, Claude, Claude Code, OpenCode…) pour consulter vos séances et
          statistiques, en lecture seule.
        </p>
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        ChatGPT et Claude (web/ordinateur) se connectent avec l'URL et votre compte Momentum
        (OAuth). Les agents et outils en ligne de commande peuvent utiliser un jeton personnel.
      </p>

      {isLoading ? (
        <div className="space-y-3 py-2" aria-label="Chargement des connexions MCP">
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
        </div>
      ) : !enabled ? (
        <p className="rounded-md bg-muted px-3 py-3 text-sm text-muted-foreground">
          Le serveur MCP n'est pas configuré sur ce serveur.
        </p>
      ) : (
        <div className="space-y-5">
          {mcpUrl && (
            <div className="space-y-2">
              <p className="text-sm font-medium">URL du serveur MCP</p>
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start">
                <code className="min-w-0 flex-1 break-all rounded-md border border-border bg-muted/50 px-3 py-3 font-mono text-xs">
                  {mcpUrl}
                </code>
                <CopyButton value={mcpUrl} label="Copier l'URL du serveur MCP" />
              </div>
            </div>
          )}

          {createdToken && (
            <div className="space-y-3 rounded-lg border border-border p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Jeton personnel créé</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Copiez ce jeton maintenant : il ne sera plus affiché.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 shrink-0"
                  onClick={() => setCreatedToken(null)}
                  aria-label="Masquer le jeton"
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start">
                <code className="min-w-0 flex-1 break-all rounded-md border border-border bg-muted/50 px-3 py-3 font-mono text-xs">
                  {createdToken.token}
                </code>
                <CopyButton value={createdToken.token} label="Copier le jeton personnel" />
              </div>
              <details className="group rounded-md border border-border px-3 py-2">
                <summary className="cursor-pointer py-1 text-sm font-medium">
                  Exemples de configuration
                </summary>
                <div className="mt-3 space-y-3">
                  <div className="space-y-2">
                    <p className="text-xs font-medium">Claude Code</p>
                    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start">
                      <code className="min-w-0 flex-1 break-all rounded-md bg-muted px-3 py-2 font-mono text-xs">
                        {claudeCommand}
                      </code>
                      <CopyButton value={claudeCommand} label="Copier la commande Claude Code" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium">OpenCode</p>
                    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start">
                      <pre className="min-w-0 flex-1 overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-muted px-3 py-2 font-mono text-xs">
                        {opencodeConfig}
                      </pre>
                      <CopyButton value={opencodeConfig} label="Copier la configuration OpenCode" />
                    </div>
                  </div>
                </div>
              </details>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-medium">Accès actifs</h3>
              <Button
                type="button"
                className="min-h-11 gap-2"
                onClick={() => setIsCreateOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Créer un jeton
              </Button>
            </div>

            {connections.length === 0 ? (
              <p className="border-t border-border py-4 text-sm text-muted-foreground">
                Aucune connexion active.
              </p>
            ) : (
              <ul>
                {connections.map((connection) => (
                  <McpConnectionRow
                    key={connection.id}
                    connection={connection}
                    onRevoke={setConnectionToRevoke}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          if (!isCreating) setIsCreateOpen(open);
        }}
      >
        <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle>Créer un jeton personnel</DialogTitle>
            <DialogDescription>
              Ce jeton donnera à votre agent un accès en lecture seule à vos données Momentum.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onCreateToken)} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="mcp-token-label" className="text-sm font-medium">
                Nom du jeton
              </label>
              <Input
                id="mcp-token-label"
                maxLength={60}
                placeholder="Mon agent"
                {...form.register("label")}
              />
              {form.formState.errors.label?.message && (
                <p className="text-sm text-destructive">{form.formState.errors.label.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="mcp-token-duration" className="text-sm font-medium">
                Durée de validité
              </label>
              <Select
                value={form.watch("expiresInDays")}
                onValueChange={(value) =>
                  form.setValue("expiresInDays", value as TokenFormValues["expiresInDays"], {
                    shouldDirty: true,
                  })
                }
              >
                <SelectTrigger id="mcp-token-duration" className="min-h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 jours</SelectItem>
                  <SelectItem value="90">90 jours</SelectItem>
                  <SelectItem value="365">1 an</SelectItem>
                  <SelectItem value="never">Jamais</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isCreating} className="min-h-11">
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Créer le jeton
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={connectionToRevoke !== null}
        onOpenChange={(open) => {
          if (!open && !isRevoking) setConnectionToRevoke(null);
        }}
        title="Révoquer cet accès ?"
        description="L'application connectée perdra immédiatement l'accès à vos données."
        onConfirm={() => void onRevoke()}
        isDeleting={isRevoking}
        confirmLabel="Révoquer"
        cancelLabel="Annuler"
      />
    </section>
  );
}
