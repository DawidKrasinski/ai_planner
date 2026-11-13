"use client";

import { useRouter } from "next/navigation";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const periods = [
  ["today", "Dziś"],
  ["yesterday", "Wczoraj"],
  ["7d", "7 dni"],
  ["30d", "30 dni"],
  ["3m", "3 miesiące"],
  ["1y", "Rok"],
  ["all", "Całość"],
] as const;

export function StatisticsView({
  period,
  summary,
  streak,
}: {
  period: string;
  streak: number;
  summary: {
    plannedMinutes: number;
    actualMinutes: number;
    effectiveMinutes: number;
    averageEfficiency: number | null;
    planCompletion: number | null;
    difficulty: number;
    byGoal: { goalId: string; goalName: string; actualMinutes: number; effectiveMinutes: number }[];
    byDay: { date: string; effectiveMinutes: number; difficulty: number }[];
    bestDay: { date: string; difficulty: number } | null;
    worstDay: { date: string; planCompletion: number } | null;
  };
}) {
  const router = useRouter();
  return (
    <div className="grid gap-5">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {periods.map(([value, label]) => (
          <button key={value} className={`min-h-11 shrink-0 rounded-full px-3 text-sm ${period === value ? "bg-accent text-white" : "bg-card"}`} type="button" onClick={() => router.push(`/statistics?period=${value}`)}>
            {label}
          </button>
        ))}
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <Card label="Czas efektywny" value={`${Math.round(summary.effectiveMinutes)} min`} />
        <Card label="Wykonanie planu" value={summary.planCompletion === null ? "—" : `${summary.planCompletion.toFixed(0)}%`} />
        <Card label="Średnia efektywność" value={summary.averageEfficiency === null ? "—" : summary.averageEfficiency.toFixed(1)} />
        <Card label="Trudność" value={summary.difficulty.toFixed(1)} />
      </dl>
      <p className="text-sm text-muted">Postęp celów jest liczony osobno i nie wynika z efektywności. Seria dni z wykonaną pracą: {streak}.</p>
      {summary.byDay.length === 0 ? <p className="text-sm text-muted">Brak zapisanych sesji w wybranym okresie.</p> : (
        <div className="h-56 rounded-2xl bg-card p-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={summary.byDay}>
              <XAxis dataKey="date" hide />
              <YAxis />
              <Tooltip />
              <Bar dataKey="effectiveMinutes" name="Czas efektywny (min)" fill="#0f5f5c" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <section>
        <h2 className="mb-2 font-semibold">Czas według celów</h2>
        <ul className="grid gap-2 text-sm">
          {summary.byGoal.map((goal) => (
            <li key={goal.goalId} className="rounded-xl bg-card p-3">{goal.goalName}: {goal.actualMinutes} min rzeczywiste, {Math.round(goal.effectiveMinutes)} min efektywne</li>
          ))}
        </ul>
      </section>
      <p className="text-sm">Najlepszy dzień: {summary.bestDay ? `${summary.bestDay.date} (${summary.bestDay.difficulty.toFixed(1)})` : "brak"}. Najsłabsze wykonanie: {summary.worstDay ? `${summary.worstDay.date} (${summary.worstDay.planCompletion.toFixed(0)}%)` : "brak"}.</p>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-card p-3"><dt className="text-muted">{label}</dt><dd className="text-xl font-semibold">{value}</dd></div>;
}
