import "server-only";
import { and, gte } from "drizzle-orm";
import { requireDb } from "@/db/client";
import { goalProgressEntries, goalSessions, goals } from "@/db/schema";
import { summarizePeriod } from "@/domain/analytics";
import { consistencyStreak } from "@/domain/metrics";
import { addIsoDays, localIsoDate, periodRange } from "@/domain/time";
import { getProfile, getSettings } from "./records";

export async function getAnalytics(period: string) {
  const profile = await getProfile();
  const settings = await getSettings();
  const today = localIsoDate(new Date(), profile.timezone);
  const range = periodRange(period, today);
  const db = requireDb();
  const sessionRows = await db.select().from(goalSessions);
  const goalRows = await db.select().from(goals);
  const names = new Map(goalRows.map((goal) => [goal.id, goal.name]));
  const progressRows = await db.select().from(goalProgressEntries).where(and(
    range ? gte(goalProgressEntries.reportedAt, new Date(`${range.start}T00:00:00.000Z`)) : gte(goalProgressEntries.reportedAt, new Date(0)),
  ));
  const records = sessionRows.flatMap((session) => {
    const date = localIsoDate(session.endedAt ?? session.createdAt, profile.timezone);
    if (range && (date < range.start || date > range.end)) {
      return [];
    }
    return [{
      goalId: session.goalId,
      goalName: names.get(session.goalId) ?? "Cel",
      date,
      plannedMinutes: session.plannedMinutes,
      actualMinutes: session.actualMinutes,
      efficiencyRating: session.efficiencyRating,
      difficulty: session.difficultySnapshot,
      status: session.completionStatus,
    }];
  });
  const summary = summarizePeriod(records, progressRows.map((entry) => ({
    goalId: entry.goalId,
    date: localIsoDate(entry.reportedAt, profile.timezone),
    value: Number(entry.progressValue),
  })), settings.capPlanCompletion);
  const days = [];
  for (let cursor = range?.start ?? addIsoDays(today, -30); cursor <= (range?.end ?? today); cursor = addIsoDays(cursor, 1)) {
    const planned = records.filter((record) => record.date === cursor);
    days.push({
      date: cursor,
      plannedSessions: planned.length,
      completedOrPartial: planned.filter((record) => record.status === "completed" || record.status === "partial").length,
    });
    if (days.length > 400) {
      break;
    }
  }
  return { summary, streak: consistencyStreak(days, today), period, capPlanCompletion: settings.capPlanCompletion };
}
