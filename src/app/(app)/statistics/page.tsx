import { StatisticsView } from "@/components/statistics-view";
import { ErrorState } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { loadPage } from "@/lib/page-data";
import { getAnalytics } from "@/services/analytics";

export default async function StatisticsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const { period = "7d" } = await searchParams;
  const allowed = ["today", "yesterday", "7d", "30d", "3m", "1y", "all"];
  const selected = allowed.includes(period) ? period : "7d";
  const loaded = await loadPage(async () => getAnalytics((await requireUser()).id, selected));
  if (!loaded.ok) {
    return <ErrorState message={loaded.message} />;
  }
  return (
    <div className="grid gap-4">
      <h1 className="serif text-3xl">Dyscyplina</h1>
      <StatisticsView period={selected} streak={loaded.data.streak} summary={loaded.data.summary} />
    </div>
  );
}
