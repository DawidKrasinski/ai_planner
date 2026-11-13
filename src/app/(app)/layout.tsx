import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
import { AppShell } from "@/components/app-shell";
import { ErrorState } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { isAppError } from "@/lib/errors";
import { ensureProfile } from "@/services/records";

export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  try {
    await ensureProfile(user.id, user.email);
  } catch (error) {
    const message = isAppError(error) ? error.message : "Baza danych nie jest skonfigurowana.";
    return (
      <main className="mx-auto max-w-lg px-4 py-10">
        <ErrorState message={message} />
      </main>
    );
  }
  return <AppShell>{children}</AppShell>;
}
