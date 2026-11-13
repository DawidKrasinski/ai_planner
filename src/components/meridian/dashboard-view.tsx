"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { clientApi } from "@/lib/client-api";
import {
  categoryColor,
  categoryLabel,
  formatMinutes,
} from "@/lib/calendar-layout";
import { Icon } from "./icon";
import { Progress } from "./progress";
import { useShell } from "./shell-context";
import { EmptyState, ErrorState, LoadingState } from "./states";
import { TopActions } from "./top-actions";

export type DashboardSession = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  status: string;
  category: string | null;
  itemType: string;
  plannedMinutes: number;
  sessionId: string | null;
};

export type DashboardGoal = {
  id: string;
  name: string;
  category: string;
  manualPriority: number;
  progressValue: number;
  weeklyBudgetLabel: string;
};

export type DashboardData = {
  greetingName: string;
  todayLabel: string;
  aiSummary: string | null;
  sessions: DashboardSession[];
  goals: DashboardGoal[];
  metrics: {
    plannedLabel: string;
    plannedNote: string;
    effectiveLabel: string;
    effectiveNote: string;
    completionLabel: string;
    completionNote: string;
    completionPercent: number;
    efficiencyLabel: string;
    efficiencyNote: string;
  };
  weekBars: number[];
  weekLabel: string;
  weekPercent: number;
};

function sessionStatus(status: string, startAt: string, endAt: string): "done" | "active" | "next" {
  if (status === "completed" || status === "partial") {
    return "done";
  }
  if (status === "skipped" || status === "cancelled") {
    return "done";
  }
  const now = Date.now();
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  if (now >= start && now <= end) {
    return "active";
  }
  if (status === "in_progress") {
    return "active";
  }
  return "next";
}

function formatClock(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function DashboardView({
  state,
}: {
  state:
    | { status: "loading" }
    | { status: "error"; message: string; onRetry?: () => void }
    | { status: "success"; data: DashboardData };
}) {
  const { openAI, openAdd } = useShell();
  const router = useRouter();
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const doneCount = useMemo(() => {
    if (state.status !== "success") {
      return 0;
    }
    return state.data.sessions.filter(
      (session) => sessionStatus(session.status, session.startAt, session.endAt) === "done",
    ).length;
  }, [state]);

  if (state.status === "loading") {
    return (
      <div className="page dashboard-page">
        <LoadingState label="Wczytywanie pulpitu…" />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="page dashboard-page">
        <ErrorState message={state.message} onRetry={state.onRetry} />
      </div>
    );
  }

  const { data } = state;

  async function completeSession(sessionId: string, plannedMinutes: number) {
    setPendingId(sessionId);
    setActionError(null);
    try {
      await clientApi(`/api/sessions/${sessionId}/complete`, {
        method: "POST",
        body: JSON.stringify({
          actualMinutes: plannedMinutes,
          efficiencyRating: 7,
          completionStatus: "completed",
        }),
      });
      router.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Nie udało się zapisać sesji.");
    } finally {
      setPendingId(null);
    }
  }

  async function startSession(sessionId: string) {
    setPendingId(sessionId);
    setActionError(null);
    try {
      await clientApi(`/api/sessions/${sessionId}/start`, { method: "POST" });
      router.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Nie udało się uruchomić sesji.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="page dashboard-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">{data.todayLabel}</p>
          <h1>Witaj, {data.greetingName}</h1>
          <p className="subtitle">
            {data.sessions.length === 0
              ? "Na dziś nie ma jeszcze zaplanowanych sesji."
              : `Dzień w toku. Ukończono ${doneCount} z ${data.sessions.length} pozycji.`}
          </p>
        </div>
        <TopActions onAdd={openAdd} openAI={openAI} />
      </div>

      {data.aiSummary ? (
        <section className="ai-banner">
          <span className="ai-orb">
            <Icon name="sparkles" />
          </span>
          <div>
            <span className="overline">PODSUMOWANIE PLANU</span>
            <p>{data.aiSummary}</p>
          </div>
          <button className="link-btn" type="button" onClick={openAI}>
            Zapytaj AI <Icon name="chevronRight" size={15} />
          </button>
        </section>
      ) : null}

      {actionError ? <ErrorState message={actionError} onRetry={() => setActionError(null)} /> : null}

      <div className="metrics-grid">
        <Metric label="Zaplanowany czas" value={data.metrics.plannedLabel} note={data.metrics.plannedNote} icon="clock" />
        <Metric label="Efektywny czas" value={data.metrics.effectiveLabel} note={data.metrics.effectiveNote} />
        <Metric
          label="Realizacja dnia"
          value={data.metrics.completionLabel}
          note={data.metrics.completionNote}
          progress={data.metrics.completionPercent}
        />
        <Metric
          label="Średnia efektywność"
          value={data.metrics.efficiencyLabel}
          note={data.metrics.efficiencyNote}
        />
      </div>

      <div className="dashboard-grid">
        <section className="card schedule-card">
          <div className="section-head">
            <div>
              <h2>Dzisiejszy plan</h2>
              <p>
                {doneCount} z {data.sessions.length} ukończone
              </p>
            </div>
            <Link className="btn ghost" href="/calendar">
              Pełny kalendarz <Icon name="chevronRight" size={15} />
            </Link>
          </div>
          {data.sessions.length === 0 ? (
            <EmptyState>Na dziś nie zaplanowano żadnych bloków.</EmptyState>
          ) : (
            <div className="timeline">
              {data.sessions.map((session, index) => {
                const status = sessionStatus(session.status, session.startAt, session.endAt);
                const color = categoryColor(session.category, session.itemType);
                return (
                  <div className={`session ${status}`} key={session.id}>
                    <div className="session-time">
                      <strong>{formatClock(session.startAt)}</strong>
                      <span>{formatClock(session.endAt)}</span>
                    </div>
                    <div className="timeline-line">
                      <span className={`status-dot ${status}`}>
                        {status === "done" ? <Icon name="check" size={11} /> : null}
                      </span>
                      {index < data.sessions.length - 1 ? <i /> : null}
                    </div>
                    <div className="session-main">
                      <span className={`category-bar ${color}`} />
                      <div>
                        <strong>{session.title}</strong>
                        <small>
                          {formatMinutes(session.plannedMinutes)} ·{" "}
                          {session.category ? categoryLabel(session.category) : session.itemType}
                        </small>
                      </div>
                      {status === "active" ? <span className="badge active-badge">W TRAKCIE</span> : null}
                      {status === "done" ? <span className="complete-text">Ukończono</span> : null}
                      {session.sessionId && status !== "done" ? (
                        <button
                          className="icon-btn"
                          type="button"
                          aria-label="Oznacz ukończone"
                          disabled={pendingId === session.sessionId}
                          onClick={() => void completeSession(session.sessionId!, session.plannedMinutes)}
                        >
                          <Icon name="check" />
                        </button>
                      ) : null}
                      {session.sessionId && status === "next" ? (
                        <button
                          className="btn ghost"
                          type="button"
                          disabled={pendingId === session.sessionId}
                          onClick={() => void startSession(session.sessionId!)}
                        >
                          Start
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="right-stack">
          <section className="card focus-card">
            <div className="section-head">
              <div>
                <h2>Aktywne cele</h2>
                <p>Najważniejsze w tym tygodniu</p>
              </div>
            </div>
            {data.goals.length === 0 ? (
              <EmptyState>Brak aktywnych celów.</EmptyState>
            ) : (
              data.goals.map((goal) => (
                <Link className="goal-mini" key={goal.id} href={`/goals/${goal.id}`}>
                  <span className={`goal-icon ${categoryColor(goal.category)}`}>
                    <Icon name="target" size={16} />
                  </span>
                  <div>
                    <strong>{goal.name}</strong>
                    <span>
                      <small>
                        P{goal.manualPriority} · {goal.weeklyBudgetLabel}
                      </small>
                      <b>{Math.round(goal.progressValue)}%</b>
                    </span>
                    <Progress value={goal.progressValue} color={categoryColor(goal.category)} />
                  </div>
                </Link>
              ))
            )}
            <Link className="full-link" href="/goals">
              Zobacz wszystkie cele <Icon name="chevronRight" size={15} />
            </Link>
          </section>

          <section className="card week-card">
            <div className="section-head">
              <div>
                <h2>Rytm tygodnia</h2>
                <p>{data.weekLabel}</p>
              </div>
              <span className="badge success">{data.weekPercent}% planu</span>
            </div>
            <div className="week-chart">
              {data.weekBars.map((value, index) => {
                const todayIndex = (new Date().getDay() + 6) % 7;
                return (
                  <div key={index}>
                    <div className="bar-track">
                      <i style={{ height: `${value}%` }} className={index === todayIndex ? "today" : ""} />
                    </div>
                    <span>{["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"][index]}</span>
                  </div>
                );
              })}
            </div>
            <div className="week-legend">
              <span>
                <i className="dot violet" />
                Nauka i praca
              </span>
              <span>
                <i className="dot blue" />
                Trening
              </span>
              <span>
                <i className="dot green" />
                Czas wolny
              </span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  note,
  icon,
  progress,
}: {
  label: string;
  value: string;
  note: string;
  icon?: "clock";
  progress?: number;
}) {
  return (
    <div className="metric card">
      <div className="metric-label">
        <span>{label}</span>
        {icon ? <Icon name={icon} size={16} /> : null}
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-note">
        <span>{note}</span>
      </div>
      {progress !== undefined ? <Progress value={progress} /> : null}
    </div>
  );
}
