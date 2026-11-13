import { HistoryView } from "@/components/meridian/history-view";
import { loadPage } from "@/lib/page-data";
import { listChanges, listPlans } from "@/services/records";

export default async function HistoryPage() {
  const loaded = await loadPage(async () => {
    const [plans, changes] = await Promise.all([listPlans(), listChanges()]);
    return {
      plans: plans.map((plan) => ({
        id: plan.id,
        versionNumber: plan.versionNumber,
        status: plan.status,
        summary: plan.aiSummary,
        createdAt: plan.createdAt.toISOString(),
      })),
      changes: changes.map((change) => ({
        id: change.id,
        createdAt: change.createdAt.toISOString(),
        actor: change.actor,
        changeType: change.changeType,
        reason: change.reason,
      })),
    };
  });
  if (!loaded.ok) {
    return <HistoryView state={{ status: "error", message: loaded.message }} />;
  }
  return <HistoryView state={{ status: "success", data: loaded.data }} />;
}
