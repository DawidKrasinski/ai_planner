"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { PeriodSummary } from "@/domain/analytics";
import { formatMinutes } from "@/lib/calendar-layout";
import { Icon } from "./icon";
import { useShell } from "./shell-context";
import { EmptyState, ErrorState, LoadingState } from "./states";
import { TopActions } from "./top-actions";

const periods = [
  { id: "today", label: "Dzisiaj" },
  { id: "yesterday", label: "Wczoraj" },
  { id: "7d", label: "7 dni" },
  { id: "30d", label: "30 dni" },
  { id: "3m", label: "3 miesiące" },
  { id: "1y", label: "Rok" },
  { id: "all", label: "Cały okres" },
] as const;

export type StatisticsData = {
  period: string;
  streak: number;
  summary: PeriodSummary;
  insight: string | null;
};

export function StatisticsView({
  state,
}: {
  state:
    | { status: "loading" }
    | { status: "error"; message: string; onRetry?: () => void }
    | { status: "success"; data: StatisticsData };
}) {
  const { openAI, openAdd } = useShell();

  const chart = useMemo(() => {
    if (state.status !== "success") {
      return [] as number[];
    }
    const days = state.data.summary.byDay;
    if (days.length === 0) {
      return [0];
    }
    const max = Math.max(...days.map((day) => day.effectiveMinutes), 1);
    return days.slice(-14).map((day) => Math.round((day.effectiveMinutes / max) * 100));
  }, [state]);

  const points = chart
    .map((value, index) => `${index * (100 / Math.max(chart.length - 1, 1))},${100 - value}`)
    .join(" ");

  if (state.status === "loading") {
    return (
      <div className="page">
        <LoadingState label="Wczytywanie statystyk…" />
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

  const { data } = state;
  const { summary } = data;
  const completion = summary.planCompletion ?? 0;
  const efficiency =
    summary.averageEfficiency === null ? null : Math.round(summary.averageEfficiency * 10); // 1–10 → %
  const byGoalTotal = summary.byGoal.reduce((sum, goal) => sum + goal.effectiveMinutes, 0) || 1;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">ANALIZA OSOBISTA</p>
          <h1>Dyscyplina i statystyki</h1>
          <p className="subtitle">
            Efektywność, wykonanie planu i postęp celów są liczone osobno.
          </p>
        </div>
        <TopActions onAdd={openAdd} openAI={openAI} />
      </div>

      <div className="period-tabs">
        {periods.map((period) => (
          <Link
            key={period.id}
            href={`/statistics?period=${period.id}`}
            className={data.period === period.id ? "active" : ""}
          >
            {period.label}
          </Link>
        ))}
      </div>

      <div className="metrics-grid stats-metrics">
        <Metric
          label="Realizacja planu"
          value={`${Math.round(completion)}%`}
          note="plan completion (nie postęp celów)"
        />
        <Metric
          label="Efektywny czas"
          value={formatMinutes(summary.effectiveMinutes)}
          note={`z ${formatMinutes(summary.plannedMinutes)} zaplanowanych`}
        />
        <Metric
          label="Średnia efektywność"
          value={efficiency === null ? "—" : `${efficiency}%`}
          note="skala 1–10 przeliczona na %"
        />
        <Metric
          label="Trudność"
          value={summary.difficulty.toFixed(1)}
          note="średnia trudność sesji"
        />
      </div>

      {data.insight ? (
        <section className="insight-card">
          <span className="ai-orb">
            <Icon name="brain" />
          </span>
          <div>
            <span className="overline">ANALIZA</span>
            <p>{data.insight}</p>
          </div>
          <button className="btn ghost" type="button" onClick={openAI}>
            Omów z AI <Icon name="chevronRight" />
          </button>
        </section>
      ) : null}

      {summary.byDay.length === 0 && summary.byGoal.length === 0 ? (
        <EmptyState>Brak zapisanych sesji w wybranym okresie.</EmptyState>
      ) : (
        <div className="analytics-grid">
          <section className="card chart-card wide">
            <div className="section-head">
              <div>
                <h2>Efektywny czas</h2>
                <p>Ostatnie dni w okresie</p>
              </div>
              <div className="chart-legend">
                <span>
                  <i className="dot violet" />
                  Efektywny
                </span>
              </div>
            </div>
            <div className="line-chart">
              <div className="y-labels">
                <span>max</span>
                <span> </span>
                <span> </span>
                <span>0</span>
              </div>
              <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#6d5ce8" stopOpacity=".22" />
                    <stop offset="1" stopColor="#6d5ce8" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={`M ${points} L 100 100 L 0 100 Z`} fill="url(#fill)" stroke="none" />
                <polyline
                  points={points}
                  fill="none"
                  stroke="#6d5ce8"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>
          </section>

          <section className="card donut-card">
            <div className="section-head">
              <div>
                <h2>Podział czasu</h2>
                <p>Według celów (czas efektywny)</p>
              </div>
            </div>
            <div className="donut-wrap">
              <div className="donut">
                <div>
                  <strong>{formatMinutes(summary.effectiveMinutes)}</strong>
                  <span>łącznie</span>
                </div>
              </div>
              <div className="donut-legend">
                {summary.byGoal.slice(0, 5).map((goal) => (
                  <span key={goal.goalId}>
                    <i className="dot violet" />
                    <b>{goal.goalName}</b>
                    <small>
                      {formatMinutes(goal.effectiveMinutes)} ·{" "}
                      {Math.round((goal.effectiveMinutes / byGoalTotal) * 100)}%
                    </small>
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="card consistency-card">
            <div className="section-head">
              <div>
                <h2>Regularność</h2>
                <p>Seria spójnych dni</p>
              </div>
              <span className="badge success">{data.streak} dni</span>
            </div>
            <div className="heatmap">
              {Array.from({ length: 84 }).map((_, index) => {
                const day = summary.byDay[index % Math.max(summary.byDay.length, 1)];
                const level =
                  !day || day.planCompletion === null
                    ? 0
                    : Math.min(4, Math.floor(day.planCompletion / 25));
                return <i key={index} className={`l${level}`} />;
              })}
            </div>
          </section>

          <section className="card records-card">
            <div className="section-head">
              <div>
                <h2>Najlepsze wyniki</h2>
                <p>Rekordy w okresie</p>
              </div>
            </div>
            <div className="record">
              <span>1</span>
              <div>
                <small>Najlepszy dzień (trudność)</small>
                <strong>{summary.bestDay?.date ?? "—"}</strong>
              </div>
              <b>{summary.bestDay ? summary.bestDay.difficulty.toFixed(1) : "—"}</b>
            </div>
            <div className="record">
              <span>2</span>
              <div>
                <small>Seria</small>
                <strong>Codzienna realizacja</strong>
              </div>
              <b>{data.streak} dni</b>
            </div>
            <div className="record">
              <span>3</span>
              <div>
                <small>Najsłabsze wykonanie planu</small>
                <strong>{summary.worstDay?.date ?? "—"}</strong>
              </div>
              <b>{summary.worstDay ? `${Math.round(summary.worstDay.planCompletion)}%` : "—"}</b>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="metric card">
      <div className="metric-label">
        <span>{label}</span>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-note">
        <span>{note}</span>
      </div>
    </div>
  );
}
