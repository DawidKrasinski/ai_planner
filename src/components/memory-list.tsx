"use client";

import { useState } from "react";
import { Button, ErrorState, fieldClass } from "@/components/ui";

export function MemoryList({ entries }: { entries: { id: string; type: string; text: string; source: string; confirmed: boolean }[] }) {
  const [error, setError] = useState<string | null>(null);
  if (entries.length === 0) {
    return <p className="text-sm text-muted">Brak wpisów pamięci.</p>;
  }
  return (
    <section className="grid gap-3">
      <h2 className="font-semibold">Pamięć asystenta</h2>
      {error ? <ErrorState message={error} /> : null}
      {entries.map((entry) => (
        <form key={entry.id} className="grid gap-2 rounded-2xl bg-card p-3" onSubmit={async (event) => {
          event.preventDefault();
          const content = String(new FormData(event.currentTarget).get("content") ?? "");
          const response = await fetch(`/api/ai/memory/${entry.id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ content, isUserConfirmed: true }),
          });
          if (!response.ok) setError("Nie udało się zapisać pamięci.");
        }}>
          <p className="text-xs text-muted">{entry.type} · {entry.source} · {entry.confirmed ? "potwierdzone" : "wniosek"}</p>
          <textarea className={fieldClass} name="content" defaultValue={entry.text} />
          <div className="flex gap-2">
            <Button type="submit">Zapisz</Button>
            <button className="min-h-11 text-sm underline" type="button" onClick={async () => {
              const response = await fetch(`/api/ai/memory/${entry.id}`, { method: "DELETE" });
              if (!response.ok) setError("Nie udało się usunąć wpisu.");
              else window.location.reload();
            }}>Usuń</button>
          </div>
        </form>
      ))}
    </section>
  );
}
