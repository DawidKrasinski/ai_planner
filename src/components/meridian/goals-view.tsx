"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CreateGoalSchema } from "@/domain/schemas";
import { clientApi } from "@/lib/client-api";
import { categoryColor, categoryLabel, difficultyLabel, formatMinutes } from "@/lib/calendar-layout";
import { Icon } from "./icon";
import { Progress } from "./progress";
import { useShell } from "./shell-context";
import { EmptyState, ErrorState, LoadingState } from "./states";
import { TopActions } from "./top-actions";

export type GoalListItem = {
  id: string;
  name: string;
  category: string;
  status: string;
  manualPriority: number;
  progressValue: number;
  currentLevel: string | null;
  desiredLevel: string | null;
  difficulty: number;
  weeklyMinutes: number;
};

const filters = [
  { id: "all", label: "Wszystkie" },
  { id: "learning_work", label: "Nauka i praca" },
  { id: "training", label: "Trening" },
  { id: "leisure", label: "Czas wolny" },
] as const;

export function GoalsView({
  state,
}: {
  state:
    | { status: "loading" }
    | { status: "error"; message: string; onRetry?: () => void }
    | { status: "success"; data: { goals: GoalListItem[] } };
}) {
  const { openAI, openAdd } = useShell();
  const router = useRouter();
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("all");
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goals = useMemo(
    () => (state.status === "success" ? state.data.goals : []),
    [state],
  );
  const filtered = useMemo(() => {
    return goals.filter((goal) => {
      if (filter !== "all" && goal.category !== filter) {
        return false;
      }
      if (query && !goal.name.toLowerCase().includes(query.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [goals, filter, query]);

  const avgProgress =
    goals.length === 0
      ? 0
      : Math.round(goals.reduce((sum, goal) => sum + goal.progressValue, 0) / goals.length);
  const activeCount = goals.filter((goal) => goal.status === "active").length;
  const budget = goals.reduce((sum, goal) => sum + goal.weeklyMinutes, 0);

  async function createGoal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = CreateGoalSchema.safeParse({
      name: form.get("name"),
      category: form.get("category"),
      manualPriority: Number(form.get("priority")),
      difficulty: Number(form.get("difficulty")),
      currentLevel: String(form.get("current") || "") || null,
      desiredLevel: String(form.get("desired") || "") || null,
      progressMethod: "percent",
      progressValue: 0,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Niepoprawne dane celu.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await clientApi("/api/goals", { method: "POST", body: JSON.stringify(parsed.data) });
      setShowCreate(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się utworzyć celu.");
    } finally {
      setPending(false);
    }
  }

  if (state.status === "loading") {
    return (
      <div className="page">
        <LoadingState label="Wczytywanie celów…" />
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

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">KIERUNEK ROZWOJU</p>
          <h1>Cele</h1>
          <p className="subtitle">
            Skupienie na {activeCount} aktywnych celach · {formatMinutes(budget)} tygodniowo
          </p>
        </div>
        <TopActions onAdd={openAdd} openAI={openAI} />
      </div>

      <div className="goal-overview card">
        <div>
          <span className="overline">ŁĄCZNY POSTĘP</span>
          <strong>{avgProgress}%</strong>
          <small>średnia aktywnych celów</small>
        </div>
        <div className="big-progress">
          <Progress value={avgProgress} />
          <span>
            {activeCount === 0
              ? "Dodaj pierwszy cel albo potwierdź propozycję asystenta."
              : `${activeCount} cele w toku.`}
          </span>
        </div>
        <div className="goal-summary">
          <span>
            <b>{activeCount}</b>Aktywne
          </span>
          <span>
            <b>{formatMinutes(budget)}</b>Budżet / tydz.
          </span>
          <span>
            <b>{goals.length}</b>Łącznie
          </span>
        </div>
      </div>

      <div className="filters">
        <div className="search-box">
          <Icon name="search" />
          <input
            aria-label="Szukaj celów"
            placeholder="Szukaj celów..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="filter-tabs">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              className={filter === item.id ? "active" : ""}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button className="btn secondary" type="button" onClick={() => setShowCreate((value) => !value)}>
          <Icon name="plus" /> Nowy cel
        </button>
      </div>

      {error ? <ErrorState message={error} onRetry={() => setError(null)} /> : null}
      {pending ? <LoadingState label="Zapisywanie celu…" /> : null}

      {showCreate ? (
        <form className="card" style={{ padding: 16, marginBottom: 16 }} onSubmit={createGoal}>
          <label className="field">
            <span>Nazwa</span>
            <input name="name" required maxLength={200} />
          </label>
          <div className="form-grid">
            <label className="field">
              <span>Kategoria</span>
              <select name="category" defaultValue="learning_work">
                <option value="learning_work">Nauka i praca</option>
                <option value="training">Trening</option>
                <option value="leisure">Czas wolny</option>
              </select>
            </label>
            <label className="field">
              <span>Priorytet</span>
              <select name="priority" defaultValue="3">
                {[1, 2, 3, 4, 5, 6].map((value) => (
                  <option key={value} value={value}>
                    P{value}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Trudność</span>
              <input name="difficulty" type="number" min={1} max={10} defaultValue={5} required />
            </label>
            <label className="field">
              <span>Poziom obecny</span>
              <input name="current" />
            </label>
            <label className="field">
              <span>Poziom docelowy</span>
              <input name="desired" />
            </label>
          </div>
          <div className="modal-actions">
            <button className="btn secondary" type="button" onClick={() => setShowCreate(false)}>
              Anuluj
            </button>
            <button className="btn primary" type="submit" disabled={pending}>
              Zapisz cel
            </button>
          </div>
        </form>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState>Nie masz jeszcze celów spełniających filtry.</EmptyState>
      ) : (
        <>
          <div className="goals-table card">
            <div className="goal-row header">
              <span>Cel</span>
              <span>Priorytet</span>
              <span>Postęp</span>
              <span>Poziom</span>
              <span>Budżet</span>
              <span>Trudność</span>
              <span />
            </div>
            {filtered.map((goal) => (
              <Link className="goal-row" key={goal.id} href={`/goals/${goal.id}`}>
                <span className="goal-name">
                  <i className={categoryColor(goal.category)} />
                  <span>
                    <strong>{goal.name}</strong>
                    <small>{categoryLabel(goal.category)}</small>
                  </span>
                </span>
                <span>
                  <b className="priority">P{goal.manualPriority}</b>
                </span>
                <span className="row-progress">
                  <b>{Math.round(goal.progressValue)}%</b>
                  <Progress value={goal.progressValue} color={categoryColor(goal.category)} />
                </span>
                <span>
                  <small>{goal.currentLevel ?? "—"}</small>
                  <strong>→ {goal.desiredLevel ?? "—"}</strong>
                </span>
                <span>{formatMinutes(goal.weeklyMinutes)} / tydz.</span>
                <span>{difficultyLabel(goal.difficulty)}</span>
                <span>
                  <Icon name="chevronRight" />
                </span>
              </Link>
            ))}
          </div>
          <div className="goal-mobile-list">
            {filtered.map((goal) => (
              <Link className="goal-mobile card" href={`/goals/${goal.id}`} key={goal.id}>
                <div>
                  <span className={`goal-icon ${categoryColor(goal.category)}`}>
                    <Icon name="target" />
                  </span>
                  <span>
                    <strong>{goal.name}</strong>
                    <small>
                      {categoryLabel(goal.category)} · P{goal.manualPriority}
                    </small>
                  </span>
                  <Icon name="chevronRight" />
                </div>
                <Progress value={goal.progressValue} color={categoryColor(goal.category)} />
                <span>
                  <b>{Math.round(goal.progressValue)}%</b>
                  <small>
                    {formatMinutes(goal.weeklyMinutes)} / tydz. · {difficultyLabel(goal.difficulty)}
                  </small>
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
