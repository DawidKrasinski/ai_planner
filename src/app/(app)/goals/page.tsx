import { GoalsView } from "@/components/meridian/goals-view";
import { loadPage } from "@/lib/page-data";
import { getSettings, listGoals } from "@/services/records";

export default async function GoalsPage() {
  const loaded = await loadPage(async () => {
    const [goals, settings] = await Promise.all([listGoals(), getSettings()]);
    return {
      goals: goals.map((goal) => ({
        id: goal.id,
        name: goal.name,
        category: goal.category,
        status: goal.status,
        manualPriority: goal.manualPriority,
        progressValue: Number(goal.progressValue),
        currentLevel: goal.currentLevel,
        desiredLevel: goal.desiredLevel,
        difficulty: goal.difficulty,
        weeklyMinutes: settings.categoryBudgets[goal.category] ?? 0,
      })),
    };
  });
  if (!loaded.ok) {
    return <GoalsView state={{ status: "error", message: loaded.message }} />;
  }
  return <GoalsView state={{ status: "success", data: loaded.data }} />;
}
