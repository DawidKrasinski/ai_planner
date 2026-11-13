import Link from "next/link";
import { ErrorState, EmptyState } from "@/components/ui";
import { localIsoDate, weekContaining, zonedTimestamp } from "@/domain/time";
import { getProfile, listCalendar, listGoals, listOpenSessions } from "@/services/records";
import { currentPlan } from "@/services/planning";
import { requireUser } from "@/lib/auth";
import { loadPage } from "@/lib/page-data";
import { PlanActions } from "@/components/plan-actions";
import { SessionList } from "@/components/session-list";

export default async function DashboardPage() {
  const loaded = await loadPage(async () => {
    const user = await requireUser();
    const profile = await getProfile(user.id);
    const today = localIsoDate(new Date(), profile.timezone);
    const items = await listCalendar(
      user.id,
      new Date(zonedTimestamp(today, "00:00", profile.timezone)),
      new Date(zonedTimestamp(today, "23:59", profile.timezone)),
    );
    const goals = (await listGoals(user.id)).filter((goal) => goal.status === "active").slice(0, 5);
    const plan = await currentPlan(user.id);
    const sessions = await listOpenSessions(user.id);
    return { today, items, goals, plan, sessions, week: weekContaining(today) };
  });
  if (!loaded.ok) {
    return <ErrorState message={loaded.message} />;
  }
  const { today, items, goals, plan, sessions, week } = loaded.data;
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="serif text-3xl">Dzisiaj</h1>
        <p className="text-sm text-muted">{today} · tydzień {week.start}</p>
      </div>
      <PlanActions />
      {plan.plan ? <p className="rounded-2xl bg-card p-4 text-sm">{plan.plan.aiSummary}</p> : <EmptyState>Nie ma jeszcze aktywnego planu na ten tydzień.</EmptyState>}
      <section>
        <h2 className="mb-2 text-lg font-semibold">Plan dnia</h2>
        {items.length === 0 ? <EmptyState>Na dziś nie zaplanowano żadnych bloków.</EmptyState> : (
          <ul className="grid gap-2">
            {items.map((item) => (
              <li key={item.id} className="rounded-2xl bg-card p-3">
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-muted">{item.itemType} · {item.status}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <SessionList sessions={sessions.map((session) => ({ id: session.id, plannedMinutes: session.plannedMinutes, goalId: session.goalId }))} />
      <section>
        <h2 className="mb-2 text-lg font-semibold">Priorytety</h2>
        {goals.length === 0 ? <EmptyState>Brak aktywnych celów.</EmptyState> : (
          <ul className="grid gap-2">
            {goals.map((goal) => (
              <li key={goal.id}>
                <Link className="block rounded-2xl bg-card p-3" href={`/goals/${goal.id}`}>
                  <span className="font-medium">{goal.name}</span>
                  <span className="mt-1 block text-sm text-muted">P{goal.manualPriority} · {goal.category} · postęp {goal.progressValue}%</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
