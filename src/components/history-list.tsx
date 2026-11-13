"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorState } from "@/components/ui";

export function HistoryList({ plans }: { plans: { id: string; versionNumber: number; status: string; summary: string; createdAt: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  if (plans.length === 0) {
    return <p className="text-sm text-muted">Nie ma jeszcze wersji planu.</p>;
  }
  return (
    <ul className="grid gap-3">
      {error ? <ErrorState message={error} /> : null}
      {plans.map((plan) => (
        <li key={plan.id} className="rounded-2xl bg-card p-4">
          <p className="font-semibold">Wersja {plan.versionNumber} · {plan.status}</p>
          <p className="text-sm text-muted">{plan.createdAt}</p>
          <p className="mt-2 text-sm">{plan.summary}</p>
          <Button className="mt-3" type="button" disabled={pending === plan.id} onClick={async () => {
            setPending(plan.id);
            const response = await fetch(`/api/plans/${plan.id}/restore`, { method: "POST" });
            setPending(null);
            if (!response.ok) {
              setError("Przywrócenie nie przeszło walidacji albo nie udało się zapisać nowej wersji.");
              return;
            }
            router.refresh();
          }}>Przywróć jako nową wersję</Button>
        </li>
      ))}
    </ul>
  );
}
