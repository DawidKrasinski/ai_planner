"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorState, Field, fieldClass } from "@/components/ui";

export function SessionList({ sessions }: { sessions: { id: string; plannedMinutes: number; goalId: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  if (sessions.length === 0) {
    return null;
  }
  return (
    <section className="grid gap-3">
      <h2 className="text-lg font-semibold">Wykonanie</h2>
      {error ? <ErrorState message={error} /> : null}
      {sessions.map((session) => (
        <form key={session.id} className="grid gap-2 rounded-2xl bg-card p-3" onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const response = await fetch(`/api/sessions/${session.id}/complete`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              actualMinutes: Number(form.get("actual")),
              efficiencyRating: Number(form.get("efficiency")),
              completionStatus: form.get("status"),
              pullForward: form.get("pull") === "on",
              progressValue: form.get("progress") ? Number(form.get("progress")) : undefined,
            }),
          });
          if (!response.ok) {
            setError("Nie udało się zapisać wykonania.");
            return;
          }
          router.refresh();
        }}>
          <p className="text-sm">Plan: {session.plannedMinutes} min</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Rzeczywiste minuty"><input className={fieldClass} name="actual" type="number" min={0} required defaultValue={session.plannedMinutes} /></Field>
            <Field label="Efektywność 1–10"><input className={fieldClass} name="efficiency" type="number" min={1} max={10} required defaultValue={7} /></Field>
          </div>
          <Field label="Status">
            <select className={fieldClass} name="status" defaultValue="completed">
              <option value="completed">Ukończone</option>
              <option value="partial">Częściowo</option>
              <option value="skipped">Pominięte</option>
            </select>
          </Field>
          <Field label="Postęp celu % (opcjonalnie)"><input className={fieldClass} name="progress" type="number" min={0} max={100} /></Field>
          <label className="flex min-h-11 items-center gap-2 text-sm"><input name="pull" type="checkbox" /> Przesuń późniejsze bloki, jeśli skończyłem wcześniej</label>
          <div className="flex gap-2">
            <Button type="submit">Zapisz</Button>
            <button className="min-h-11 text-sm underline" type="button" onClick={() => fetch(`/api/sessions/${session.id}/start`, { method: "POST" })}>Start</button>
          </div>
        </form>
      ))}
    </section>
  );
}
