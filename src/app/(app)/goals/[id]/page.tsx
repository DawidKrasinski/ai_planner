import { notFound } from "next/navigation";
import { GoalActions } from "@/components/goal-actions";
import { ErrorState } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { loadPage } from "@/lib/page-data";
import { getGoal, listProgress, listSessionsForGoal } from "@/services/records";

export default async function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loaded = await loadPage(async () => {
    const user = await requireUser();
    const goal = await getGoal(user.id, id);
    const progress = await listProgress(user.id, id);
    const sessions = await listSessionsForGoal(user.id, id);
    return { goal, progress, sessions };
  });
  if (!loaded.ok) {
    if (loaded.code === "NOT_FOUND") {
      notFound();
    }
    return <ErrorState message={loaded.message} />;
  }
  const { goal, progress, sessions } = loaded.data;
  const actual = sessions.reduce((sum, session) => sum + (session.actualMinutes ?? 0), 0);
  const effective = sessions.reduce((sum, session) => sum + Number(session.effectiveMinutes ?? 0), 0);
  return (
    <div className="grid gap-5">
      <div>
        <h1 className="serif text-3xl">{goal.name}</h1>
        <p className="text-sm text-muted">{goal.category} · priorytet {goal.manualPriority} · trudność {goal.difficulty}{goal.difficultyIsEstimate ? " (szacunek)" : ""}</p>
        <p className="mt-2 text-sm">{goal.description}</p>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <Metric label="Czas rzeczywisty" value={`${actual} min`} />
        <Metric label="Czas efektywny" value={`${Math.round(effective)} min`} />
        <Metric label="Postęp" value={`${goal.progressValue} ${goal.progressMethod}`} />
      </dl>
      <GoalActions id={goal.id} status={goal.status} />
      <section>
        <h2 className="mb-2 font-semibold">Historia postępu</h2>
        <ul className="grid gap-2 text-sm">
          {progress.map((entry) => (
            <li key={entry.id} className="rounded-xl bg-card p-3">{entry.reportedAt.toISOString().slice(0, 10)} · {entry.progressValue} {entry.progressUnit}</li>
          ))}
        </ul>
      </section>
      {goal.planningNotes ? <p className="text-sm text-muted">{goal.planningNotes}</p> : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card p-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-lg font-semibold">{value}</dd>
    </div>
  );
}
