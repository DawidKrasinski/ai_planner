import { DashboardView, type DashboardData } from "@/components/meridian/dashboard-view";
import { formatMinutes } from "@/lib/calendar-layout";
import { loadPage } from "@/lib/page-data";
import { addIsoDays, localIsoDate, weekContaining, zonedTimestamp } from "@/domain/time";
import { getAnalytics } from "@/services/analytics";
import { currentPlan } from "@/services/planning";
import { getProfile, getSettings, listCalendar, listGoals, listOpenSessions } from "@/services/records";

export default async function DashboardPage() {
  const loaded = await loadPage(async () => {
    const profile = await getProfile();
    const settings = await getSettings();
    const today = localIsoDate(new Date(), profile.timezone);
    const week = weekContaining(today);
    const [items, goals, plan, sessions, analytics] = await Promise.all([
      listCalendar(
        new Date(zonedTimestamp(today, "00:00", profile.timezone)),
        new Date(zonedTimestamp(today, "23:59", profile.timezone)),
      ),
      listGoals(),
      currentPlan(),
      listOpenSessions(),
      getAnalytics("7d"),
    ]);
    const sessionByItem = new Map(
      sessions
        .filter((session) => session.calendarItemId)
        .map((session) => [session.calendarItemId as string, session]),
    );
    const activeGoals = goals.filter((goal) => goal.status === "active");
    const plannedMinutes = items.reduce(
      (sum, item) => sum + Math.max(0, (item.endAt.getTime() - item.startAt.getTime()) / 60_000),
      0,
    );
    const done = items.filter((item) => item.status === "completed" || item.status === "partial").length;
    const completionPercent = items.length === 0 ? 0 : Math.round((done / items.length) * 100);
    const weekDays = Array.from({ length: 7 }, (_, index) => addIsoDays(week.start, index));
    const weekItems = await listCalendar(
      new Date(zonedTimestamp(week.start, "00:00", profile.timezone)),
      new Date(zonedTimestamp(week.end, "23:59", profile.timezone)),
    );
    const weekBars = weekDays.map((day) => {
      const dayItems = weekItems.filter((item) => localIsoDate(item.startAt, profile.timezone) === day);
      if (dayItems.length === 0) {
        return 8;
      }
      const completed = dayItems.filter((item) => item.status === "completed" || item.status === "partial").length;
      return Math.max(8, Math.round((completed / dayItems.length) * 100));
    });
    const weekPlanned = weekItems.reduce(
      (sum, item) => sum + Math.max(0, (item.endAt.getTime() - item.startAt.getTime()) / 60_000),
      0,
    );
    const weekDoneMinutes = weekItems
      .filter((item) => item.status === "completed" || item.status === "partial")
      .reduce((sum, item) => sum + Math.max(0, (item.endAt.getTime() - item.startAt.getTime()) / 60_000), 0);
    const weekPercent = weekPlanned === 0 ? 0 : Math.round((weekDoneMinutes / weekPlanned) * 100);

    const data: DashboardData = {
      greetingName: profile.displayName.split(/\s+/)[0] || profile.displayName,
      todayLabel: new Date(zonedTimestamp(today, "12:00", profile.timezone)).toLocaleDateString("pl-PL", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
      aiSummary: plan.plan?.aiSummary ?? null,
      sessions: items.map((item) => {
        const linked = sessionByItem.get(item.id);
        return {
          id: item.id,
          title: item.title,
          startAt: item.startAt.toISOString(),
          endAt: item.endAt.toISOString(),
          status: linked?.completionStatus ?? item.status,
          category: goals.find((goal) => goal.id === item.sourceGoalId)?.category ?? null,
          itemType: item.itemType,
          plannedMinutes: linked?.plannedMinutes ?? Math.round((item.endAt.getTime() - item.startAt.getTime()) / 60_000),
          sessionId: linked?.id ?? null,
        };
      }),
      goals: activeGoals.slice(0, 3).map((goal) => ({
        id: goal.id,
        name: goal.name,
        category: goal.category,
        manualPriority: goal.manualPriority,
        progressValue: Number(goal.progressValue),
        weeklyBudgetLabel: `${Math.round(settings.categoryBudgets[goal.category] / 60)}h / tydz.`,
      })),
      metrics: {
        plannedLabel: formatMinutes(plannedMinutes),
        plannedNote: `${items.length} pozycji`,
        effectiveLabel: formatMinutes(analytics.summary.effectiveMinutes),
        effectiveNote: "ostatnie 7 dni",
        completionLabel: `${completionPercent}%`,
        completionNote: `${done} z ${items.length} pozycji`,
        completionPercent,
        efficiencyLabel:
          analytics.summary.averageEfficiency === null
            ? "—"
            : `${Math.round(analytics.summary.averageEfficiency * 10)}%`,
        efficiencyNote: "średnia z 7 dni",
      },
      weekBars,
      weekLabel: `${formatMinutes(weekDoneMinutes)} z ${formatMinutes(weekPlanned)}`,
      weekPercent,
    };
    return data;
  });

  if (!loaded.ok) {
    return <DashboardView state={{ status: "error", message: loaded.message }} />;
  }
  return <DashboardView state={{ status: "success", data: loaded.data }} />;
}
