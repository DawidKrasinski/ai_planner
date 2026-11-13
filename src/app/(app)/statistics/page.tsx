import { StatisticsView } from "@/components/meridian/statistics-view";
import { loadPage } from "@/lib/page-data";
import { getAnalytics } from "@/services/analytics";
import { currentPlan } from "@/services/planning";

export default async function StatisticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period = "7d" } = await searchParams;
  const allowed = ["today", "yesterday", "7d", "30d", "3m", "1y", "all"];
  const selected = allowed.includes(period) ? period : "7d";
  const loaded = await loadPage(async () => {
    const [analytics, plan] = await Promise.all([getAnalytics(selected), currentPlan()]);
    return {
      period: analytics.period,
      streak: analytics.streak,
      summary: analytics.summary,
      insight: plan.plan?.aiSummary ?? null,
    };
  });
  if (!loaded.ok) {
    return <StatisticsView state={{ status: "error", message: loaded.message }} />;
  }
  return <StatisticsView state={{ status: "success", data: loaded.data }} />;
}
