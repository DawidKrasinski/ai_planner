import { SettingsForm } from "@/components/settings-form";
import { ErrorState } from "@/components/ui";
import { isGoogleConfigured, parseServerEnv } from "@/lib/env";
import { requireUser } from "@/lib/auth";
import { loadPage } from "@/lib/page-data";
import { getSettings, listMemory } from "@/services/records";
import { MemoryList } from "@/components/memory-list";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ google?: string }> }) {
  const google = (await searchParams).google;
  const loaded = await loadPage(async () => {
    const user = await requireUser();
    return { settings: await getSettings(user.id), memory: await listMemory(user.id) };
  });
  if (!loaded.ok) {
    return <ErrorState message={loaded.message} />;
  }
  return (
    <div className="grid gap-5">
      <h1 className="serif text-3xl">Ustawienia</h1>
      {google === "connected" ? <p className="text-sm text-accent">Google Calendar został połączony.</p> : null}
      {google === "error" ? <ErrorState message="Połączenie z Google nie powiodło się. Kalendarz wewnętrzny pozostał bez zmian." /> : null}
      <SettingsForm settings={loaded.data.settings} googleConfigured={isGoogleConfigured(parseServerEnv(process.env))} />
      <MemoryList entries={loaded.data.memory.map((entry) => ({
        id: entry.id,
        type: entry.memoryType,
        text: readMemory(entry.content),
        source: entry.sourceType,
        confirmed: entry.isUserConfirmed,
      }))} />
      <section className="rounded-2xl bg-card p-4 text-sm">
        <h2 className="font-semibold">Dane</h2>
        <p className="mt-2 text-muted">Historia jest przechowywana bezterminowo, dopóki jej świadomie nie usuniesz. Eksport nie zawiera tokenów.</p>
        <a className="mt-3 inline-flex min-h-11 items-center underline" href="/api/account">Pobierz eksport JSON</a>
      </section>
    </div>
  );
}

function readMemory(content: unknown): string {
  if (content && typeof content === "object" && "text" in content && typeof content.text === "string") {
    return content.text;
  }
  return JSON.stringify(content);
}
