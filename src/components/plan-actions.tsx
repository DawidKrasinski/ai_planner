"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorState } from "@/components/ui";

export function PlanActions() {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function run(source: "system" | "ai") {
    setPending(source);
    setError(null);
    try {
      const response = await fetch("/api/calendar/replan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        setError(messageOf(body) ?? "Nie udało się ułożyć planu.");
        return;
      }
      const data = (body as { data: { summary?: string } }).data;
      setNote(data.summary ?? "Plan zapisany.");
      router.refresh();
    } catch {
      setError("Nie udało się ułożyć planu.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={pending !== null} onClick={() => run("system")}>{pending === "system" ? "Układanie…" : "Ułóż tydzień"}</Button>
        <button className="min-h-11 rounded-full border border-line bg-card px-4 text-sm" type="button" disabled={pending !== null} onClick={() => run("ai")}>
          {pending === "ai" ? "Pytam asystenta…" : "Plan z AI"}
        </button>
      </div>
      {error ? <ErrorState message={error} /> : null}
      {note ? <p className="text-sm text-muted">{note}</p> : null}
    </div>
  );
}

function messageOf(body: unknown): string | null {
  if (!body || typeof body !== "object" || !("error" in body)) return null;
  const error = body.error;
  return error && typeof error === "object" && "message" in error && typeof error.message === "string" ? error.message : null;
}
