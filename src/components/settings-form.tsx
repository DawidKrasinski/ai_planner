"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SettingsInput } from "@/domain/schemas";
import { Button, ErrorState, Field, fieldClass } from "@/components/ui";

export function SettingsForm({ settings, googleConfigured }: { settings: SettingsInput; googleConfigured: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next: SettingsInput = {
      ...settings,
      wakeTime: String(form.get("wake")),
      sleepTime: String(form.get("sleep")),
      transitionMinutes: Number(form.get("transition")),
      capPlanCompletion: form.get("cap") === "on",
      googleExportEnabled: form.get("export") === "on",
      categoryBudgets: {
        training: Number(form.get("training")),
        learning_work: Number(form.get("learning")),
        leisure: Number(form.get("leisure")),
      },
    };
    setPending(true);
    setError(null);
    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(next),
    });
    setPending(false);
    if (!response.ok) {
      setError("Nie udało się zapisać ustawień.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  async function connect() {
    const response = await fetch("/api/integrations/google/connect", { method: "POST" });
    const body: unknown = await response.json();
    if (!response.ok || !body || typeof body !== "object" || !("data" in body)) {
      setError(googleConfigured ? "Nie udało się rozpocząć połączenia." : "Integracja Google nie jest skonfigurowana. Aplikacja działa bez niej.");
      return;
    }
    const data = body.data as { url?: string };
    if (data.url) {
      window.location.href = data.url;
    }
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <section className="grid gap-3 rounded-2xl bg-card p-4">
        <h2 className="font-semibold">Sen i dzień</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Pobudka"><input className={fieldClass} name="wake" defaultValue={settings.wakeTime} required /></Field>
          <Field label="Sen"><input className={fieldClass} name="sleep" defaultValue={settings.sleepTime} required /></Field>
          <Field label="Przejście (min)"><input className={fieldClass} name="transition" type="number" defaultValue={settings.transitionMinutes} /></Field>
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm"><input name="cap" type="checkbox" defaultChecked={settings.capPlanCompletion} /> Ogranicz wyświetlane wykonanie planu do 100%</label>
      </section>
      <section className="grid gap-3 rounded-2xl bg-card p-4">
        <h2 className="font-semibold">Budżety kategorii (minuty tygodniowo)</h2>
        <Field label="Trening"><input className={fieldClass} name="training" type="number" defaultValue={settings.categoryBudgets.training} /></Field>
        <Field label="Nauka / praca"><input className={fieldClass} name="learning" type="number" defaultValue={settings.categoryBudgets.learning_work} /></Field>
        <Field label="Czas wolny"><input className={fieldClass} name="leisure" type="number" defaultValue={settings.categoryBudgets.leisure} /></Field>
      </section>
      <section className="grid gap-3 rounded-2xl bg-card p-4">
        <h2 className="font-semibold">Google Calendar</h2>
        <p className="text-sm text-muted">Opcjonalne. Import tworzy stałe zobowiązania. Eksport wygenerowanych sesji jest wyłączony, dopóki go nie włączysz.</p>
        <label className="flex min-h-11 items-center gap-2 text-sm"><input name="export" type="checkbox" defaultChecked={settings.googleExportEnabled} /> Pozwól eksportować sesje celów</label>
        <button className="min-h-11 rounded-full border border-line px-4 text-sm" type="button" onClick={connect}>Połącz Google</button>
        <button className="min-h-11 text-left text-sm underline" type="button" onClick={() => fetch("/api/integrations/google/sync", { method: "POST" })}>Synchronizuj</button>
        <button className="min-h-11 text-left text-sm underline" type="button" onClick={() => fetch("/api/integrations/google/disconnect", { method: "POST" })}>Rozłącz</button>
      </section>
      {error ? <ErrorState message={error} /> : null}
      {saved ? <p className="text-sm text-accent">Zapisano.</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "Zapisywanie…" : "Zapisz ustawienia"}</Button>
    </form>
  );
}
