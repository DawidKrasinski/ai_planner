"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorState, Field, fieldClass } from "@/components/ui";

const empty = {
  name: "",
  description: "",
  category: "learning_work",
  manualPriority: 3,
  difficulty: 5,
  progressMethod: "percent",
  progressValue: 0,
};

export function GoalForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const response = await fetch("/api/goals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        description: form.get("description") || undefined,
        category: form.get("category"),
        manualPriority: Number(form.get("priority")),
        difficulty: Number(form.get("difficulty")),
        progressMethod: form.get("method") || "percent",
        progressValue: Number(form.get("progress") || 0),
        deadlineAt: form.get("deadline") ? new Date(String(form.get("deadline"))).toISOString() : null,
      }),
    });
    setPending(false);
    if (!response.ok) {
      setError("Sprawdź pola celu. Priorytet to 1–6, trudność 1–10.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <form className="grid gap-3 rounded-2xl bg-card p-4" onSubmit={submit}>
      <h2 className="font-semibold">Nowy cel</h2>
      <Field label="Nazwa"><input className={fieldClass} name="name" required defaultValue={empty.name} /></Field>
      <Field label="Opis"><textarea className={fieldClass} name="description" /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Kategoria">
          <select className={fieldClass} name="category" defaultValue={empty.category}>
            <option value="training">Trening</option>
            <option value="learning_work">Nauka / praca</option>
            <option value="leisure">Czas wolny</option>
          </select>
        </Field>
        <Field label="Priorytet 1–6"><input className={fieldClass} name="priority" type="number" min={1} max={6} defaultValue={3} required /></Field>
        <Field label="Trudność 1–10"><input className={fieldClass} name="difficulty" type="number" min={1} max={10} defaultValue={5} required /></Field>
        <Field label="Postęp %"><input className={fieldClass} name="progress" type="number" min={0} max={100} defaultValue={0} /></Field>
      </div>
      <Field label="Termin"><input className={fieldClass} name="deadline" type="datetime-local" /></Field>
      <input type="hidden" name="method" value="percent" />
      {error ? <ErrorState message={error} /> : null}
      <Button type="submit" disabled={pending}>{pending ? "Zapisywanie…" : "Zapisz cel"}</Button>
    </form>
  );
}
