import { PageHeader } from "@/components/layout";

export default function Home() {
  return (
    <div>
      <PageHeader title="Aujourd'hui" subtitle="Votre tableau de bord quotidien" />

      <div className="space-y-6">
        {/* Placeholder content */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-medium">Bienvenue sur Momentum</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Votre tableau de bord apparaîtra ici.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Série
            </p>
            <p className="mt-1 text-3xl font-semibold font-mono text-accent-orange">
              0
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Progression du jour
            </p>
            <p className="mt-1 text-3xl font-semibold font-mono">0%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
