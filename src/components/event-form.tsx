"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorState, Field, fieldClass } from "@/components/ui";

export function EventForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const response = await fetch("/api/calendar/items", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        itemType: form.get("fixed") === "on" ? "fixed_commitment" : "one_off_event",
        title: form.get("title"),
        startAt: new Date(String(form.get("start"))).toISOString(),
        endAt: new Date(String(form.get("end"))).toISOString(),
        isFixed: form.get("fixed") === "on",
        travelMinutes: Number(form.get("travel") || 0),
        preparationMinutes: Number(form.get("prep") || 0),
      }),
    });
    setPending(false);
    if (!response.ok) {
      setError("Nie udało się dodać zdarzenia.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <form className="grid gap-3 rounded-2xl bg-card p-4" onSubmit={submit}>
      <h2 className="font-semibold">Dodaj zdarzenie</h2>
      <Field label="Nazwa"><input className={fieldClass} name="title" required maxLength={200} /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Początek"><input className={fieldClass} type="datetime-local" name="start" required /></Field>
        <Field label="Koniec"><input className={fieldClass} type="datetime-local" name="end" required /></Field>
      </div>
      <label className="flex min-h-11 items-center gap-2 text-sm"><input name="fixed" type="checkbox" /> Stałe, nieprzesuwalne automatycznie</label>
      {error ? <ErrorState message={error} /> : null}
      <Button type="submit" disabled={pending}>{pending ? "Zapisywanie…" : "Dodaj"}</Button>
    </form>
  );
}
