"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorState, Field, fieldClass } from "@/components/ui";

export function GoalActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function setStatus(next: string) {
    setPending(true);
    setError(null);
    const response = await fetch(`/api/goals/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setPending(false);
    if (!response.ok) {
      setError("Nie udało się zmienić statusu.");
      return;
    }
    router.refresh();
  }

  async function addProgress(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    const response = await fetch(`/api/goals/${id}/progress`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        progressValue: Number(form.get("value")),
        progressMethod: "percent",
        notes: String(form.get("notes") || ""),
        source: "user",
      }),
    });
    setPending(false);
    if (!response.ok) {
      setError("Nie udało się zapisać postępu.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {status === "active" ? <Button type="button" disabled={pending} onClick={() => setStatus("paused")}>Wstrzymaj</Button> : null}
        {status === "paused" ? <Button type="button" disabled={pending} onClick={() => setStatus("active")}>Wznów</Button> : null}
        <button className="min-h-11 rounded-full border border-line px-4 text-sm" type="button" disabled={pending} onClick={() => setStatus("completed")}>Zakończ</button>
        <button className="min-h-11 rounded-full border border-line px-4 text-sm" type="button" disabled={pending} onClick={() => setStatus("archived")}>Archiwizuj</button>
      </div>
      <form className="grid gap-3 rounded-2xl bg-card p-4" onSubmit={addProgress}>
        <Field label="Nowy postęp %"><input className={fieldClass} name="value" type="number" min={0} max={100} required /></Field>
        <Field label="Notatka"><input className={fieldClass} name="notes" /></Field>
        <Button type="submit" disabled={pending}>Zapisz postęp</Button>
      </form>
      {error ? <ErrorState message={error} /> : null}
    </div>
  );
}
