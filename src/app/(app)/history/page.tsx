import { HistoryList } from "@/components/history-list";
import { ErrorState } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { loadPage } from "@/lib/page-data";
import { listChanges, listPlans } from "@/services/records";

export default async function HistoryPage() {
  const loaded = await loadPage(async () => {
    const user = await requireUser();
    const [plans, changes] = await Promise.all([listPlans(user.id), listChanges(user.id)]);
    return { plans, changes };
  });
  if (!loaded.ok) {
    return <ErrorState message={loaded.message} />;
  }
  const { plans, changes } = loaded.data;
  return (
    <div className="grid gap-5">
      <h1 className="serif text-3xl">Historia</h1>
      <HistoryList plans={plans.map((plan) => ({
        id: plan.id,
        versionNumber: plan.versionNumber,
        status: plan.status,
        summary: plan.aiSummary,
        createdAt: plan.createdAt.toISOString(),
      }))} />
      <section>
        <h2 className="mb-2 font-semibold">Zmiany</h2>
        <ul className="grid gap-2 text-sm">
          {changes.map((change) => (
            <li key={change.id} className="rounded-xl bg-card p-3">
              {change.createdAt.toISOString()} · {change.actor} · {change.changeType}
              <span className="mt-1 block text-muted">{change.reason}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
