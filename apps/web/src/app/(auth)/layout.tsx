export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Subtle gradient overlay */}
      <div className="fixed inset-0 bg-linear-to-br from-zinc-900/50 via-transparent to-zinc-900/30 pointer-events-none" />

      {/* Content */}
      <main className="relative flex-1 flex items-center justify-center p-4">
        {children}
      </main>
    </div>
  );
}
