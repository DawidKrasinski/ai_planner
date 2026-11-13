import "server-only";
import { and, eq, gte, lte } from "drizzle-orm";
import { requireDb } from "@/db/client";
import { aiMemoryEntries, backgroundJobs, calendarItems, goalSessions, goals, weeklyGoalBudgets, weeklyPlans } from "@/db/schema";
import { summarizePeriod } from "@/domain/analytics";
import { assessOverload } from "@/domain/overload";
import { addIsoDays, localIsoDate, weekContaining, zonedTimestamp } from "@/domain/time";
import { AppError } from "@/lib/errors";
import { logInfo } from "@/lib/log";
import { generateWeekPlan } from "./planning";
import { getProfile, getSettings } from "./records";

export async function runEveningReview(userId: string) {
  const profile = await getProfile(userId);
  const today = localIsoDate(new Date(), profile.timezone);
  return withJob(userId, "evening_review", `evening:${userId}:${today}`, async () => {
    const start = new Date(zonedTimestamp(today, "00:00", profile.timezone));
    const end = new Date(zonedTimestamp(today, "23:59", profile.timezone));
    const db = requireDb();
    const items = await db.select().from(calendarItems).where(and(
      eq(calendarItems.userId, userId),
      eq(calendarItems.itemType, "goal_session"),
      gte(calendarItems.startAt, start),
      lte(calendarItems.startAt, end),
    ));
    const sessions = items.length
      ? await db.select().from(goalSessions).where(eq(goalSessions.userId, userId))
      : [];
    const byItem = new Map(sessions.map((session) => [session.calendarItemId, session]));
    const missing = items.filter((item) => {
      const session = byItem.get(item.id);
      return !session || session.completionStatus === "not_started" || session.completionStatus === "in_progress";
    }).map((item) => ({ id: item.id, title: item.title, startAt: item.startAt.toISOString() }));
    if (missing.length > 0) {
      return {
        status: "needs_input" as const,
        missing,
        message: "Brakuje potwierdzonych danych wykonania. Nic nie zostało dopisane automatycznie.",
      };
    }
    const settings = await getSettings(userId);
    const summary = summarizePeriod(sessions.filter((session) => session.calendarItemId && items.some((item) => item.id === session.calendarItemId)).map((session) => ({
      goalId: session.goalId,
      goalName: session.goalId,
      date: today,
      plannedMinutes: session.plannedMinutes,
      actualMinutes: session.actualMinutes,
      efficiencyRating: session.efficiencyRating,
      difficulty: session.difficultySnapshot,
      status: session.completionStatus,
    })), [], settings.capPlanCompletion);
    await db.insert(aiMemoryEntries).values({
      userId,
      memoryType: "evening_conclusion",
      content: {
        date: today,
        effectiveMinutes: summary.effectiveMinutes,
        planCompletion: summary.planCompletion,
        note: "Wniosek z potwierdzonych danych, bez uzupełniania braków.",
      },
      sourceType: "evening_review",
      confidence: "1",
      isUserConfirmed: false,
    });
    return { status: "complete" as const, missing: [], summary };
  });
}

export async function runWeeklyReview(userId: string) {
  const profile = await getProfile(userId);
  const settings = await getSettings(userId);
  const today = localIsoDate(new Date(), profile.timezone);
  const week = weekContaining(today);
  return withJob(userId, "weekly_review", `weekly:${userId}:${week.start}`, async () => {
    const db = requireDb();
    const sessions = await db.select().from(goalSessions).where(eq(goalSessions.userId, userId));
    const goalRows = await db.select().from(goals).where(eq(goals.userId, userId));
    const completion = sessions
      .filter((session) => session.actualMinutes !== null && session.efficiencyRating !== null && session.plannedMinutes > 0)
      .map((session) => ((session.actualMinutes ?? 0) * ((session.efficiencyRating ?? 0) / 10) / session.plannedMinutes) * 100);
    const activePlan = (await db.select().from(weeklyPlans).where(and(
      eq(weeklyPlans.userId, userId),
      eq(weeklyPlans.periodStart, week.start),
      eq(weeklyPlans.status, "active"),
    )).limit(1))[0];
    const budgets = activePlan
      ? await db.select().from(weeklyGoalBudgets).where(eq(weeklyGoalBudgets.weeklyPlanId, activePlan.id))
      : [];
    const planned = new Map(budgets.map((budget) => [budget.goalId, budget.plannedMinutes]));
    const assessment = assessOverload({
      recentCompletion: completion.slice(-7),
      scheduledMinutes: sessions.reduce((sum, session) => sum + session.plannedMinutes, 0),
      goals: goalRows.filter((goal) => goal.status === "active").map((goal) => ({
        id: goal.id,
        manualPriority: goal.manualPriority,
        plannedMinutes: planned.get(goal.id) ?? 0,
      })),
      sleepPressure: budgets.some((budget) => (budget.borrowedFromCategory ?? "").includes("sleep")),
      config: settings.overload,
    });
    if (assessment.action === "ask") {
      await db.insert(aiMemoryEntries).values({
        userId,
        memoryType: "weekly_conclusion",
        content: { week: week.start, action: "ask", reason: assessment.reason },
        sourceType: "weekly_review",
        confidence: "0.8",
        isUserConfirmed: false,
      });
      return { assessment, plan: null };
    }
    const nextAnchor = addIsoDays(week.end, 1);
    const plan = await generateWeekPlan(userId, {
      anchorDate: nextAnchor,
      reason: "weekly_review",
      actor: "system",
      source: "system",
      minuteOverrides: Object.fromEntries(assessment.reductions.map((item) => [item.goalId, item.toMinutes])),
    });
    return { assessment, plan };
  });
}

async function withJob<T>(userId: string, jobType: string, key: string, work: () => Promise<T>): Promise<T> {
  const db = requireDb();
  const existing = (await db.select().from(backgroundJobs).where(eq(backgroundJobs.idempotencyKey, key)).limit(1))[0];
  if (existing?.status === "succeeded") {
    return existing.resultSummary as T;
  }
  if (existing?.status === "running") {
    throw new AppError("JOB_ALREADY_RUNNING", "To zadanie już trwa.", 409);
  }
  if (existing) {
    await db.update(backgroundJobs).set({
      status: "running",
      startedAt: new Date(),
      attemptCount: existing.attemptCount + 1,
      errorCode: null,
      errorDetails: null,
    }).where(eq(backgroundJobs.id, existing.id));
  } else {
    await db.insert(backgroundJobs).values({
      userId,
      jobType,
      scheduledFor: new Date(),
      startedAt: new Date(),
      status: "running",
      idempotencyKey: key,
      attemptCount: 1,
    });
  }
  try {
    const result = await work();
    const needsInput = typeof result === "object" && result !== null && "status" in result && result.status === "needs_input";
    await db.update(backgroundJobs).set({
      status: needsInput ? "failed" : "succeeded",
      completedAt: new Date(),
      resultSummary: result,
      errorCode: needsInput ? "NEEDS_INPUT" : null,
    }).where(eq(backgroundJobs.idempotencyKey, key));
    logInfo("job.succeeded", { jobType, userId });
    return result;
  } catch (error) {
    await db.update(backgroundJobs).set({
      status: "failed",
      completedAt: new Date(),
      errorCode: error instanceof AppError ? error.code : "INTERNAL_ERROR",
      errorDetails: error instanceof Error ? error.message : "unknown",
    }).where(eq(backgroundJobs.idempotencyKey, key));
    throw error;
  }
}
