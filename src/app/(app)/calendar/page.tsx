import { CalendarView } from "@/components/meridian/calendar-view";
import { categoryColor, formatMinutes } from "@/lib/calendar-layout";
import { loadPage } from "@/lib/page-data";
import { localIsoDate, weekContaining, zonedTimestamp } from "@/domain/time";
import { currentPlan } from "@/services/planning";
import { getProfile, getSettings, listCalendar, listChanges, listGoals, listOpenSessions } from "@/services/records";

export default async function CalendarPage() {
  const loaded = await loadPage(async () => {
    const profile = await getProfile();
    const settings = await getSettings();
    const today = localIsoDate(new Date(), profile.timezone);
    const week = weekContaining(today);
    const [items, goals, sessions, plan, changes] = await Promise.all([
      listCalendar(
        new Date(zonedTimestamp(week.start, "00:00", profile.timezone)),
        new Date(zonedTimestamp(week.end, "23:59", profile.timezone)),
      ),
      listGoals(),
      listOpenSessions(),
      currentPlan(),
      listChanges(),
    ]);
    const goalsById = new Map(goals.map((goal) => [goal.id, goal]));
    const sessionByItem = new Map(
      sessions
        .filter((session) => session.calendarItemId)
        .map((session) => [session.calendarItemId as string, session]),
    );
    const wakeHour = Number(settings.wakeTime.slice(0, 2));
    const sleepHour = Number(settings.sleepTime.slice(0, 2));
    const dayStartHour = Number.isFinite(wakeHour) ? Math.min(wakeHour, 7) : 7;
    const dayEndHour = Number.isFinite(sleepHour) && sleepHour > dayStartHour ? sleepHour : Math.max(dayStartHour + 8, 14);
    const latestChange = changes[0];
    return {
      timezone: profile.timezone,
      weekStart: week.start,
      today,
      dayStartHour,
      dayEndHour,
      categoryBudgets: settings.categoryBudgets,
      notice: plan.plan?.aiSummary ?? latestChange?.reason ?? null,
      unscheduled: goals
        .filter((goal) => goal.status === "active")
        .filter((goal) => !items.some((item) => item.sourceGoalId === goal.id && item.status === "scheduled"))
        .slice(0, 6)
        .map((goal) => ({
          id: goal.id,
          title: goal.name,
          meta: `P${goal.manualPriority} · ${formatMinutes(settings.categoryBudgets[goal.category] ?? 0)} / tydz.`,
          color: categoryColor(goal.category),
        })),
      events: items.map((item) => {
        const linked = sessionByItem.get(item.id);
        const goal = item.sourceGoalId ? goalsById.get(item.sourceGoalId) : undefined;
        return {
          id: item.id,
          title: item.title,
          startAt: item.startAt.toISOString(),
          endAt: item.endAt.toISOString(),
          status: linked?.completionStatus ?? item.status,
          itemType: item.itemType,
          category: goal?.category ?? null,
          goalName: goal?.name ?? null,
          sessionId: linked?.id ?? null,
          plannedMinutes:
            linked?.plannedMinutes ??
            Math.round((item.endAt.getTime() - item.startAt.getTime()) / 60_000),
          isFixed: item.isFixed,
          why: item.placementReason || null,
        };
      }),
    };
  });

  if (!loaded.ok) {
    return <CalendarView state={{ status: "error", message: loaded.message }} />;
  }
  return <CalendarView state={{ status: "success", data: loaded.data }} />;
}
