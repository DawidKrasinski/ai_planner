import { notFound } from "next/navigation";
import { GoalDetailView } from "@/components/meridian/goal-detail-view";
import { loadPage } from "@/lib/page-data";
import { getGoal, getSettings, listProgress, listSessionsForGoal } from "@/services/records";

export default async function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loaded = await loadPage(async () => {
    const [goal, progress, sessions, settings] = await Promise.all([
      getGoal(id),
      listProgress(id),
      listSessionsForGoal(id),
      getSettings(),
    ]);
    return {
      id: goal.id,
      name: goal.name,
      description: goal.description,
      category: goal.category,
      status: goal.status,
      manualPriority: goal.manualPriority,
      progressValue: Number(goal.progressValue),
      currentLevel: goal.currentLevel,
      desiredLevel: goal.desiredLevel,
      difficulty: goal.difficulty,
      deadlineAt: goal.deadlineAt?.toISOString() ?? null,
      weeklyMinutes: settings.categoryBudgets[goal.category] ?? 0,
      progressHistory: progress
        .slice(0, 8)
        .reverse()
        .map((entry) => Number(entry.progressValue)),
      planningNotes: goal.planningNotes,
      sessionCount: sessions.length,
    };
  });
  if (!loaded.ok) {
    if (loaded.code === "NOT_FOUND") {
      notFound();
    }
    return <GoalDetailView state={{ status: "error", message: loaded.message }} />;
  }
  return <GoalDetailView state={{ status: "success", data: loaded.data }} />;
}
