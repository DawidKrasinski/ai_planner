import Link from "next/link";
import { GoalForm } from "@/components/goal-form";
import { EmptyState, ErrorState } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { loadPage } from "@/lib/page-data";
import { listGoals } from "@/services/records";

export default async function GoalsPage() {
  const loaded = await loadPage(async () => listGoals((await requireUser()).id));
  if (!loaded.ok) {
    return <ErrorState message={loaded.message} />;
  }
  const goals = loaded.data;
  return (
    <div className="grid gap-5">
      <h1 className="serif text-3xl">Cele</h1>
      <GoalForm />
      {goals.length === 0 ? <EmptyState>Nie masz jeszcze celów.</EmptyState> : (
        <ul className="grid gap-2">
          {goals.map((goal) => (
            <li key={goal.id}>
              <Link href={`/goals/${goal.id}`} className="block rounded-2xl bg-card p-4">
                <span className="font-semibold">{goal.name}</span>
                <span className="mt-1 block text-sm text-muted">{goal.category} · P{goal.manualPriority} · {goal.status} · postęp {goal.progressValue}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
