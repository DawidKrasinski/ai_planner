import { AppShell } from "@/components/app-shell";
import { ErrorState } from "@/components/meridian/states";
import { isAppError } from "@/lib/errors";
import { ensureProfile, getProfile, listGoals } from "@/services/records";

export const dynamic = "force-dynamic";

export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  const bootstrapped = await loadShellData();
  if (!bootstrapped.ok) {
    return (
      <main className="page">
        <ErrorState message={bootstrapped.message} />
      </main>
    );
  }

  return (
    <AppShell profileName={bootstrapped.profileName} goals={bootstrapped.goals}>
      {children}
    </AppShell>
  );
}

async function loadShellData(): Promise<
  | { ok: true; profileName: string; goals: { id: string; name: string }[] }
  | { ok: false; message: string }
> {
  try {
    await ensureProfile();
    const [profile, goalRows] = await Promise.all([getProfile(), listGoals()]);
    return {
      ok: true,
      profileName: profile.displayName,
      goals: goalRows
        .filter((goal) => goal.status === "active" || goal.status === "paused")
        .map((goal) => ({ id: goal.id, name: goal.name })),
    };
  } catch (error) {
    return {
      ok: false,
      message: isAppError(error) ? error.message : "Baza danych nie jest skonfigurowana.",
    };
  }
}
