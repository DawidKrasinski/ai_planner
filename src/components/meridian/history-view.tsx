"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApi } from "@/lib/client-api";
import { Icon } from "./icon";
import { useShell } from "./shell-context";
import { EmptyState, ErrorState, LoadingState } from "./states";
import { TopActions } from "./top-actions";

export type HistoryPlan = {
  id: string;
  versionNumber: number;
  status: string;
  summary: string;
  createdAt: string;
};

export type HistoryChange = {
  id: string;
  createdAt: string;
  actor: string;
  changeType: string;
  reason: string;
};

export function HistoryView({
  state,
}: {
  state:
    | { status: "loading" }
    | { status: "error"; message: string; onRetry?: () => void }
    | { status: "success"; data: { plans: HistoryPlan[]; changes: HistoryChange[] } };
}) {
  const { openAI, openAdd } = useShell();
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (state.status === "loading") {
    return (
      <div className="page">
        <LoadingState label="Wczytywanie historii…" />
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="page">
        <ErrorState message={state.message} onRetry={state.onRetry} />
      </div>
    );
  }

  const { plans, changes } = state.data;

  async function restore(planId: string) {
    setPending(planId);
    setError(null);
    try {
      await clientApi(`/api/plans/${planId}/restore`, { method: "POST" });
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Przywrócenie nie przeszło walidacji albo nie udało się zapisać nowej wersji.",
      );
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">ŚLEDZENIE ZMIAN</p>
          <h1>Historia</h1>
          <p className="subtitle">Przywrócenie tworzy nową wersję planu — historia nie jest kasowana.</p>
        </div>
        <TopActions onAdd={openAdd} openAI={openAI} />
      </div>

      <p>
        <Link className="btn secondary" href="/settings">
          ← Wróć do ustawień
        </Link>
      </p>

      {error ? <ErrorState message={error} onRetry={() => setError(null)} /> : null}
      {pending ? <LoadingState label="Przywracanie wersji…" /> : null}

      <section className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div className="section-head">
          <div>
            <h2>Wersje planu</h2>
            <p>Restore zapisuje nową wersję po walidacji silnika</p>
          </div>
        </div>
        {plans.length === 0 ? (
          <EmptyState>Nie ma jeszcze wersji planu.</EmptyState>
        ) : (
          <ul className="detail-list">
            {plans.map((plan) => (
              <li key={plan.id} style={{ listStyle: "none" }}>
                <div>
                  <span>
                    Wersja {plan.versionNumber} · {plan.status}
                  </span>
                  <strong>{new Date(plan.createdAt).toLocaleString("pl-PL")}</strong>
                </div>
                <p className="subtitle">{plan.summary || "Brak podsumowania AI."}</p>
                <button
                  className="btn secondary"
                  type="button"
                  disabled={pending === plan.id}
                  onClick={() => void restore(plan.id)}
                >
                  <Icon name="undo" /> Przywróć jako nową wersję
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card" style={{ padding: 16 }}>
        <div className="section-head">
          <div>
            <h2>Dziennik zmian</h2>
            <p>Aktor, typ i powód</p>
          </div>
        </div>
        {changes.length === 0 ? (
          <EmptyState>Brak zapisanych zmian.</EmptyState>
        ) : (
          <ul className="detail-list">
            {changes.map((change) => (
              <li key={change.id} style={{ listStyle: "none" }}>
                <div>
                  <span>
                    {change.actor} · {change.changeType}
                  </span>
                  <strong>{new Date(change.createdAt).toLocaleString("pl-PL")}</strong>
                </div>
                <p className="subtitle">{change.reason}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
