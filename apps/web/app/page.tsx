import { Suspense } from "react";
import { AppShell } from "../components/layout/AppShell";

export default function HomePage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-7xl p-6 text-sm text-muted" data-testid="app-loading">...</main>}>
      <AppShell />
    </Suspense>
  );
}
