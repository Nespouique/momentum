import { AppLayout, PageHeader } from "@/components/layout";

export default function Home() {
  return (
    <AppLayout>
      <PageHeader
        title="Today"
        subtitle="Your daily dashboard"
      />

      <div className="space-y-6">
        {/* Placeholder content */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-medium">Welcome to Momentum</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your fitness tracking dashboard will appear here.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Streak
            </p>
            <p className="mt-1 text-3xl font-semibold font-mono text-accent-orange">
              0
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Today&apos;s Progress
            </p>
            <p className="mt-1 text-3xl font-semibold font-mono">
              0%
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
