"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApi } from "@/lib/client-api";
import { categoryColor, categoryLabel, difficultyLabel, formatMinutes } from "@/lib/calendar-layout";
import { Icon } from "./icon";
import { Progress } from "./progress";
import { ErrorState, LoadingState } from "./states";

export type GoalDetailData = {
  id: string;
  name: string;
  description: string;
  category: string;
  status: string;
  manualPriority: number;
  progressValue: number;
  currentLevel: string | null;
  desiredLevel: string | null;
  difficulty: number;
  deadlineAt: string | null;
  weeklyMinutes: number;
  progressHistory: number[];
  planningNotes: string;
};

export function GoalDetailView({
  state,
  asDrawer = false,
  onClose,
}: {
  state:
    | { status: "loading" }
    | { status: "error"; message: string; onRetry?: () => void }
    | { status: "success"; data: GoalDetailData };
  asDrawer?: boolean;
  onClose?: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressValue, setProgressValue] = useState(
    state.status === "success" ? String(Math.round(state.data.progressValue)) : "0",
  );

  if (state.status === "loading") {
    return asDrawer ? (
      <div className="drawer-backdrop">
        <aside className="detail-drawer goal-detail">
          <LoadingState />
        </aside>
      </div>
    ) : (
      <div className="page">
        <LoadingState label="Wczytywanie celu…" />
      </div>
    );
  }

  if (state.status === "error") {
    return asDrawer ? (
      <div className="drawer-backdrop" onClick={onClose}>
        <aside className="detail-drawer goal-detail" onClick={(e) => e.stopPropagation()}>
          <ErrorState message={state.message} onRetry={state.onRetry} />
        </aside>
      </div>
    ) : (
      <div className="page">
        <ErrorState message={state.message} onRetry={state.onRetry} />
      </div>
    );
  }

  const goal = state.data;
  const color = categoryColor(goal.category);

  async function patchStatus(status: string) {
    setPending(true);
    setError(null);
    try {
      await clientApi(`/api/goals/${goal.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zaktualizować celu.");
    } finally {
      setPending(false);
    }
  }

  async function archive() {
    setPending(true);
    setError(null);
    try {
      await clientApi(`/api/goals/${goal.id}/archive`, { method: "POST" });
      router.push("/goals");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zarchiwizować.");
    } finally {
      setPending(false);
    }
  }

  async function saveProgress(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await clientApi(`/api/goals/${goal.id}/progress`, {
        method: "POST",
        body: JSON.stringify({
          progressValue: Number(progressValue),
          progressMethod: "percent",
        }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zapisać postępu.");
    } finally {
      setPending(false);
    }
  }

  const body = (
    <>
      <div className="drawer-head">
        <span className={`goal-icon ${color}`}>
          <Icon name="target" />
        </span>
        <div>
          {asDrawer ? (
            <button className="icon-btn" type="button" onClick={onClose} aria-label="Zamknij">
              <Icon name="x" />
            </button>
          ) : (
            <Link className="icon-btn" href="/goals" aria-label="Wróć">
              <Icon name="x" />
            </Link>
          )}
        </div>
      </div>
      <div className="badges">
        <span className="priority">P{goal.manualPriority}</span>
        <span className="badge success">{goal.status.toUpperCase()}</span>
      </div>
      <h2>{goal.name}</h2>
      <p className="subtitle">{goal.description || categoryLabel(goal.category)}</p>
      {error ? <ErrorState message={error} onRetry={() => setError(null)} /> : null}
      {pending ? <LoadingState label="Zapisywanie…" /> : null}
      <div className="goal-progress-big">
        <span>
          <strong>{Math.round(goal.progressValue)}%</strong>
          <small>postępu celu</small>
        </span>
        <Progress value={goal.progressValue} color={color} />
        <div>
          <span>
            <small>Obecnie</small>
            <b>{goal.currentLevel ?? "—"}</b>
          </span>
          <Icon name="chevronRight" />
          <span>
            <small>Cel</small>
            <b>{goal.desiredLevel ?? "—"}</b>
          </span>
        </div>
      </div>
      <div className="detail-list">
        <div>
          <span>Budżet tygodniowy</span>
          <strong>{formatMinutes(goal.weeklyMinutes)}</strong>
        </div>
        <div>
          <span>Trudność</span>
          <strong>
            {goal.difficulty} · {difficultyLabel(goal.difficulty)}
          </strong>
        </div>
        <div>
          <span>Termin</span>
          <strong>
            {goal.deadlineAt ? new Date(goal.deadlineAt).toLocaleDateString("pl-PL") : "Brak"}
          </strong>
        </div>
        <div>
          <span>Kategoria</span>
          <strong>{categoryLabel(goal.category)}</strong>
        </div>
      </div>
      <form className="detail-list" onSubmit={saveProgress}>
        <label className="field">
          <span>Aktualizuj postęp %</span>
          <input
            type="number"
            min={0}
            max={100}
            value={progressValue}
            onChange={(event) => setProgressValue(event.target.value)}
          />
        </label>
        <button className="btn secondary full" type="submit" disabled={pending}>
          Zapisz postęp
        </button>
      </form>
      <div className="mini-history">
        <div className="section-head">
          <div>
            <h3>Postęp</h3>
            <p>Historia (ostatnie wpisy)</p>
          </div>
        </div>
        <div>
          {(goal.progressHistory.length > 0 ? goal.progressHistory : [goal.progressValue]).map(
            (value, index) => (
              <i style={{ height: `${Math.max(8, value)}%` }} key={index} />
            ),
          )}
        </div>
      </div>
      {goal.planningNotes ? (
        <div className="goal-observation">
          <Icon name="sparkles" />
          <p>
            <strong>Notatki</strong>
            {goal.planningNotes}
          </p>
        </div>
      ) : null}
      <div className="modal-actions" style={{ flexDirection: "column", gap: 8 }}>
        {goal.status === "active" ? (
          <button className="btn secondary full" type="button" disabled={pending} onClick={() => void patchStatus("paused")}>
            <Icon name="pause" /> Wstrzymaj
          </button>
        ) : null}
        {goal.status === "paused" ? (
          <button className="btn secondary full" type="button" disabled={pending} onClick={() => void patchStatus("active")}>
            Wznów
          </button>
        ) : null}
        {goal.status !== "completed" ? (
          <button className="btn primary full" type="button" disabled={pending} onClick={() => void patchStatus("completed")}>
            <Icon name="check" /> Zakończ cel
          </button>
        ) : null}
        <button className="btn ghost full" type="button" disabled={pending} onClick={() => void archive()}>
          Archiwizuj
        </button>
      </div>
    </>
  );

  if (asDrawer) {
    return (
      <div className="drawer-backdrop" onClick={onClose}>
        <aside className="detail-drawer goal-detail" onClick={(event) => event.stopPropagation()}>
          {body}
        </aside>
      </div>
    );
  }

  return <div className="page">{body}</div>;
}
