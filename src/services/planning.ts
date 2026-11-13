import "server-only";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { getAIProvider } from "@/ai/provider";
import { requireDb } from "@/db/client";
import { calendarItems, goalSessions, weeklyGoalBudgets, weeklyPlans } from "@/db/schema";
import { allocateBaselineBudgets, applyMinuteOverrides } from "@/domain/budgets";
import { computeUrgency } from "@/domain/urgency";
import { schedule } from "@/domain/scheduling/engine";
import { ENGINE_VERSION, type GoalCategory, type HardBlockInput, type PlanningInput, type ScheduledBlock } from "@/domain/scheduling/types";
import { BudgetProposalSchema } from "@/domain/schemas";
import { pullForward } from "@/domain/scheduling/pull-forward";
import { eachIsoDate, isoWeekday, localIsoDate, weekContaining, zonedTimestamp } from "@/domain/time";
import { AppError } from "@/lib/errors";
import {
  getProfile,
  getSettings,
  listCalendar,
  listCommitments,
  listGoals,
  listRoutines,
  recordChange,
} from "./records";

const scheduledKinds = new Set([
  "goal_session",
  "routine_occurrence",
  "meal",
  "transition",
  "break",
  "travel",
  "preparation",
  "flexible_task",
]);

export async function generateWeekPlan(userId: string, options: {
  anchorDate?: string;
  reason: string;
  actor: "user" | "ai" | "system";
  source: "ai" | "system";
  minuteOverrides?: Record<string, number>;
}) {
  const profile = await getProfile(userId);
  const settings = await getSettings(userId);
  const anchor = options.anchorDate ?? localIsoDate(new Date(), profile.timezone);
  const week = weekContaining(anchor);
  const goalRows = (await listGoals(userId)).filter((goal) => goal.status === "active");
  const now = new Date();
  const budgetGoals = goalRows.map((goal) => ({
    id: goal.id,
    category: goal.category,
    manualPriority: goal.manualPriority,
    urgency: computeUrgency({
      manualPriority: goal.manualPriority,
      deadlineAt: goal.deadlineAt,
      now,
      config: settings.urgency,
    }).urgency,
  }));
  let summary = "Plan ułożony deterministycznie, bez modelu AI.";
  let chosen = allocateBaselineBudgets(budgetGoals, settings.categoryBudgets);
  if (options.source === "ai") {
    const provider = getAIProvider();
    if (!provider.configured) {
      throw new AppError("AI_PROVIDER_UNAVAILABLE", "Dostawca AI nie jest skonfigurowany. Bieżący plan pozostał bez zmian.", 503);
    }
    const proposal = await provider.generateStructured({
      task: "budget",
      schema: BudgetProposalSchema,
      system: "Zwróć wyłącznie budżet tygodniowy w minutach. Nie zmieniaj priorytetu ręcznego. Nie proponuj skracania snu, chyba że priorytet celu to 6.",
      prompt: `GOALS_JSON:${JSON.stringify(budgetGoals)}\nBUDGETS_JSON:${JSON.stringify(settings.categoryBudgets)}`,
    });
    summary = proposal.output.summary;
    const known = new Set(goalRows.map((goal) => goal.id));
    chosen = proposal.output.goals.filter((goal) => known.has(goal.goalId)).map((goal) => ({
      goalId: goal.goalId,
      minutes: goal.minutes,
      reason: goal.rationale,
      allowTrainingBorrow: goal.allowTrainingBorrow,
      allowSleepBorrow: goal.allowSleepBorrow,
    }));
  }
  chosen = applyMinuteOverrides(chosen, options.minuteOverrides);
  return commitPlan(userId, week, chosen, summary, options.reason, options.actor);
}

export async function replanCurrentWeek(userId: string, reason: string, actor: "user" | "ai" | "system") {
  const profile = await getProfile(userId);
  const week = weekContaining(localIsoDate(new Date(), profile.timezone));
  const db = requireDb();
  const active = (await db.select().from(weeklyPlans).where(and(
    eq(weeklyPlans.userId, userId),
    eq(weeklyPlans.periodStart, week.start),
    eq(weeklyPlans.status, "active"),
  )).limit(1))[0];
  const budgets = active
    ? await db.select().from(weeklyGoalBudgets).where(eq(weeklyGoalBudgets.weeklyPlanId, active.id))
    : [];
  const chosen = budgets.length > 0
    ? budgets.map((budget) => ({
      goalId: budget.goalId,
      minutes: budget.plannedMinutes,
      reason: budget.reason,
      allowTrainingBorrow: (budget.borrowedFromCategory ?? "").includes("training"),
      allowSleepBorrow: (budget.borrowedFromCategory ?? "").includes("sleep"),
    }))
    : allocateBaselineBudgets(
      (await listGoals(userId)).filter((goal) => goal.status === "active").map((goal) => ({
        id: goal.id,
        category: goal.category,
        manualPriority: goal.manualPriority,
        urgency: goal.manualPriority * 100,
      })),
      (await getSettings(userId)).categoryBudgets,
    );
  return commitPlan(userId, week, chosen, active?.aiSummary || "Przeliczono układ tygodnia wokół zmienionych zobowiązań.", reason, actor);
}

async function commitPlan(
  userId: string,
  week: { start: string; end: string },
  chosen: { goalId: string; minutes: number; reason: string; allowTrainingBorrow: boolean; allowSleepBorrow: boolean }[],
  summary: string,
  reason: string,
  actor: "user" | "ai" | "system",
) {
  const db = requireDb();
  const profile = await getProfile(userId);
  const settings = await getSettings(userId);
  const goalRows = (await listGoals(userId)).filter((goal) => goal.status === "active");
  const rangeStart = zonedTimestamp(week.start, "00:00", profile.timezone);
  const rangeEnd = zonedTimestamp(week.end, "23:59", profile.timezone);
  const existing = await listCalendar(userId, new Date(rangeStart), new Date(rangeEnd));
  const routines = await listRoutines(userId);
  const commitments = await listCommitments(userId);
  const dates = eachIsoDate(week.start, week.end);
  const hard: HardBlockInput[] = [];
  const preservedIds = new Set<string>();

  for (const item of existing) {
    const immovable = item.isFixed || item.isUserLocked || item.status === "completed" || item.status === "partial" || item.status === "skipped";
    if (!immovable) {
      continue;
    }
    preservedIds.add(item.id);
    hard.push({
      id: item.id,
      title: item.title,
      start: item.startAt.getTime(),
      end: item.endAt.getTime(),
      kind: item.itemType,
      travelMinutes: item.travelMinutes,
      preparationMinutes: item.preparationMinutes,
      locked: item.isUserLocked,
      preserved: item.status !== "scheduled",
      goalId: item.sourceGoalId ?? undefined,
    });
  }

  const newFixed: typeof calendarItems.$inferInsert[] = [];
  for (const commitment of commitments) {
    for (const date of dates) {
      if (!commitment.daysOfWeek.includes(isoWeekday(date))) {
        continue;
      }
      const start = zonedTimestamp(date, commitment.startTime, profile.timezone);
      const end = zonedTimestamp(date, commitment.endTime, profile.timezone);
      if (hard.some((block) => block.start === start && block.end === end)) {
        continue;
      }
      const id = crypto.randomUUID();
      hard.push({
        id,
        title: commitment.title,
        start,
        end,
        kind: "fixed_commitment",
        travelMinutes: commitment.travelMinutes,
        preparationMinutes: commitment.preparationMinutes,
      });
      newFixed.push({
        id,
        userId,
        itemType: "fixed_commitment",
        title: commitment.title,
        startAt: new Date(start),
        endAt: new Date(end),
        timezone: profile.timezone,
        isFixed: true,
        commitmentDefinitionId: commitment.id,
        travelMinutes: commitment.travelMinutes,
        preparationMinutes: commitment.preparationMinutes,
        placementReason: "Stałe zobowiązanie.",
      });
    }
  }

  const byId = new Map(goalRows.map((goal) => [goal.id, goal]));
  const planning: PlanningInput = {
    periodStart: week.start,
    periodEnd: week.end,
    timezone: profile.timezone,
    wakeTime: settings.wakeTime,
    sleepTime: settings.sleepTime,
    transitionMinutes: settings.transitionMinutes,
    breakAfterMinutes: settings.breakAfterMinutes,
    breakMinutes: settings.breakMinutes,
    minUsefulSessionMinutes: settings.minUsefulSessionMinutes,
    categoryBudgets: settings.categoryBudgets,
    priorityBorrowCaps: settings.priorityBorrowCaps,
    sleepBorrowMaxMinutes: settings.sleepBorrowMaxMinutes,
    meals: settings.meals.map((meal) => ({ ...meal, title: meal.title })),
    routines: routines.map((routine) => ({
      id: routine.id,
      title: routine.title,
      durationMinutes: routine.durationMinutes,
      windowStart: routine.windowStart,
      windowEnd: routine.windowEnd,
      daysOfWeek: routine.daysOfWeek,
      travelMinutes: routine.travelMinutes,
      preparationMinutes: routine.preparationMinutes,
    })),
    flexibleTasks: existing.filter((item) => item.itemType === "flexible_task").map((item) => ({
      id: item.id,
      title: item.title,
      durationMinutes: Math.max(15, Math.round((item.endAt.getTime() - item.startAt.getTime()) / 60_000)),
      windowStart: item.flexibleWindowStart?.getTime() ?? item.startAt.getTime(),
      windowEnd: item.flexibleWindowEnd?.getTime() ?? item.endAt.getTime(),
      priority: 3,
    })),
    hardBlocks: hard,
    goals: chosen.flatMap((budget) => {
      const goal = byId.get(budget.goalId);
      if (!goal) {
        return [];
      }
      const urgency = computeUrgency({
        manualPriority: goal.manualPriority,
        deadlineAt: goal.deadlineAt,
        now: new Date(),
        config: settings.urgency,
      });
      return [{
        id: goal.id,
        title: goal.name,
        category: goal.category as GoalCategory,
        manualPriority: goal.manualPriority,
        urgency: urgency.urgency,
        requestedMinutes: budget.minutes,
        minSessionMinutes: settings.minUsefulSessionMinutes,
        maxSessionMinutes: 180,
        preferredSessionMinutes: 60,
        allowTrainingBorrow: budget.allowTrainingBorrow && goal.manualPriority >= 5,
        allowSleepBorrow: budget.allowSleepBorrow && goal.manualPriority === 6,
      }];
    }),
    previousBlocks: existing.map(toScheduled),
  };
  const result = schedule(planning);
  if (!result.validation.ok) {
    throw new AppError("SCHEDULING_CONFLICT", "Nie udało się ułożyć planu bez naruszania ograniczeń.", 409, {
      violations: result.violations,
      warnings: result.warnings,
    });
  }

  const planId = await db.transaction(async (tx) => {
    const latest = (await tx.select().from(weeklyPlans).where(and(
      eq(weeklyPlans.userId, userId),
      eq(weeklyPlans.periodStart, week.start),
    )).orderBy(desc(weeklyPlans.versionNumber)).limit(1))[0];
    await tx.update(weeklyPlans).set({ status: "superseded" }).where(and(
      eq(weeklyPlans.userId, userId),
      eq(weeklyPlans.periodStart, week.start),
      eq(weeklyPlans.status, "active"),
    ));
    const [plan] = await tx.insert(weeklyPlans).values({
      userId,
      periodStart: week.start,
      periodEnd: week.end,
      versionNumber: (latest?.versionNumber ?? 0) + 1,
      status: "active",
      generationReason: reason,
      aiSummary: summary,
      engineVersion: ENGINE_VERSION,
      engineDiagnostics: {
        warnings: result.warnings,
        unscheduled: result.unscheduledMinutes,
        borrowed: result.borrowed,
      },
    }).returning();
    if (!plan) {
      throw new AppError("INTERNAL_ERROR", "Nie udało się zapisać wersji planu.", 500);
    }
    if (chosen.length > 0) {
      await tx.insert(weeklyGoalBudgets).values(chosen.map((budget) => ({
        weeklyPlanId: plan.id,
        goalId: budget.goalId,
        plannedMinutes: budget.minutes,
        reason: budget.reason,
        borrowedFromCategory: result.borrowed.filter((item) => item.goalId === budget.goalId).map((item) => item.from).join(",") || null,
      })));
    }
    if (newFixed.length > 0) {
      await tx.insert(calendarItems).values(newFixed);
    }
    await tx.delete(calendarItems).where(and(
      eq(calendarItems.userId, userId),
      eq(calendarItems.aiGenerated, true),
      eq(calendarItems.isUserLocked, false),
      eq(calendarItems.status, "scheduled"),
      gte(calendarItems.startAt, new Date(rangeStart)),
      lte(calendarItems.startAt, new Date(rangeEnd)),
    ));
    const fresh = result.blocks.filter((block) => !preservedIds.has(block.id) && scheduledKinds.has(block.kind) && block.kind !== "flexible_task");
    if (fresh.length > 0) {
      const rows = fresh.map((block) => ({
        id: crypto.randomUUID(),
        userId,
        itemType: block.kind,
        title: block.title,
        startAt: new Date(block.start),
        endAt: new Date(block.end),
        timezone: profile.timezone,
        isFixed: false,
        sourceGoalId: block.goalId ?? null,
        weeklyPlanId: plan.id,
        placementReason: block.reason,
        aiGenerated: true,
        routineDefinitionId: block.kind === "routine_occurrence" ? block.sourceId ?? null : null,
      }));
      await tx.insert(calendarItems).values(rows);
      const sessionRows = rows.filter((row) => row.itemType === "goal_session" && row.sourceGoalId);
      if (sessionRows.length > 0) {
        await tx.insert(goalSessions).values(sessionRows.map((row) => {
          const goal = byId.get(row.sourceGoalId ?? "");
          return {
            userId,
            goalId: row.sourceGoalId ?? "",
            calendarItemId: row.id,
            plannedMinutes: Math.round((row.endAt.getTime() - row.startAt.getTime()) / 60_000),
            difficultySnapshot: goal?.difficulty ?? 5,
            prioritySnapshot: goal?.manualPriority ?? 3,
          };
        }));
      }
    }
    await recordChange(tx, userId, plan.id, "plan_committed", actor, reason, null, {
      summary,
      unscheduled: result.unscheduledMinutes,
      borrowed: result.borrowed,
    });
    return plan.id;
  });

  return {
    planId,
    summary,
    warnings: result.warnings,
    unscheduled: result.unscheduledMinutes,
    borrowed: result.borrowed,
  };
}

export async function moveCalendarItem(userId: string, itemId: string, startAt: string, endAt: string, preference: "once" | "recurring") {
  const db = requireDb();
  const item = (await db.select().from(calendarItems).where(and(eq(calendarItems.userId, userId), eq(calendarItems.id, itemId))).limit(1))[0];
  if (!item) {
    throw new AppError("NOT_FOUND", "Nie znaleziono elementu kalendarza.", 404);
  }
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (end <= start) {
    throw new AppError("VALIDATION_ERROR", "Koniec musi być późniejszy niż początek.", 400);
  }
  await db.update(calendarItems).set({
    startAt: start,
    endAt: end,
    isUserLocked: item.itemType === "goal_session" ? true : item.isUserLocked,
    updatedAt: new Date(),
  }).where(eq(calendarItems.id, itemId));
  if (preference === "recurring") {
    const { aiMemoryEntries } = await import("@/db/schema");
    await db.insert(aiMemoryEntries).values({
      userId,
      memoryType: "schedule_preference",
      content: { itemId, title: item.title, startAt, endAt, note: "Użytkownik oznaczył przesunięcie jako trwałą preferencję." },
      sourceType: "explicit_user",
      confidence: "1",
      isUserConfirmed: true,
    });
  }
  await recordChange(db, userId, item.weeklyPlanId, "calendar_moved", "user", preference === "recurring" ? "Trwała zmiana preferencji." : "Jednorazowe przesunięcie.", { start: item.startAt, end: item.endAt }, { start, end });
  return replanCurrentWeek(userId, "Przeliczenie po ręcznym przesunięciu.", "user");
}

export async function createCalendarItem(userId: string, input: {
  itemType: "one_off_event" | "fixed_commitment" | "flexible_task";
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  isFixed: boolean;
  travelMinutes?: number;
  preparationMinutes?: number;
  flexibleWindowStart?: string | null;
  flexibleWindowEnd?: string | null;
}) {
  const db = requireDb();
  const profile = await getProfile(userId);
  const [item] = await db.insert(calendarItems).values({
    userId,
    itemType: input.itemType,
    title: input.title,
    description: input.description ?? "",
    startAt: new Date(input.startAt),
    endAt: new Date(input.endAt),
    timezone: profile.timezone,
    isFixed: input.isFixed,
    travelMinutes: input.travelMinutes ?? 0,
    preparationMinutes: input.preparationMinutes ?? 0,
    flexibleWindowStart: input.flexibleWindowStart ? new Date(input.flexibleWindowStart) : null,
    flexibleWindowEnd: input.flexibleWindowEnd ? new Date(input.flexibleWindowEnd) : null,
  }).returning();
  if (input.isFixed) {
    await replanCurrentWeek(userId, "Nowe stałe zdarzenie.", "user");
  }
  return item;
}

export async function restorePlan(userId: string, planId: string) {
  const db = requireDb();
  const plan = (await db.select().from(weeklyPlans).where(and(eq(weeklyPlans.userId, userId), eq(weeklyPlans.id, planId))).limit(1))[0];
  if (!plan) {
    throw new AppError("NOT_FOUND", "Nie znaleziono wersji planu.", 404);
  }
  const budgets = await db.select().from(weeklyGoalBudgets).where(eq(weeklyGoalBudgets.weeklyPlanId, plan.id));
  return commitPlan(
    userId,
    { start: plan.periodStart, end: plan.periodEnd },
    budgets.map((budget) => ({
      goalId: budget.goalId,
      minutes: budget.plannedMinutes,
      reason: `Przywrócono wersję ${plan.versionNumber}. ${budget.reason}`,
      allowTrainingBorrow: (budget.borrowedFromCategory ?? "").includes("training"),
      allowSleepBorrow: (budget.borrowedFromCategory ?? "").includes("sleep"),
    })),
    `Przywrócono plan z ${plan.createdAt.toISOString()} jako nową wersję. Historia pośrednia została zachowana.`,
    "restore",
    "user",
  );
}

export function shiftAfterEarlyCompletion(blocks: { id: string; start: number; end: number; fixed: boolean; locked: boolean; preserved: boolean; kind: ScheduledBlock["kind"]; title: string; reason: string }[], freedStart: number, freedEnd: number) {
  return pullForward(blocks.map((block) => ({
    ...block,
    fixed: block.fixed,
    locked: block.locked,
    preserved: block.preserved,
  })), { start: freedStart, end: freedEnd }, 0);
}

function toScheduled(item: typeof calendarItems.$inferSelect): ScheduledBlock {
  return {
    id: item.id,
    kind: item.itemType,
    title: item.title,
    start: item.startAt.getTime(),
    end: item.endAt.getTime(),
    goalId: item.sourceGoalId ?? undefined,
    sourceId: item.id,
    reason: item.placementReason,
    fixed: item.isFixed,
    locked: item.isUserLocked,
    preserved: item.status !== "scheduled",
  };
}

export async function currentPlan(userId: string) {
  const db = requireDb();
  const profile = await getProfile(userId);
  const week = weekContaining(localIsoDate(new Date(), profile.timezone));
  const plan = (await db.select().from(weeklyPlans).where(and(
    eq(weeklyPlans.userId, userId),
    eq(weeklyPlans.periodStart, week.start),
    eq(weeklyPlans.status, "active"),
  )).limit(1))[0] ?? null;
  const budgets = plan ? await db.select().from(weeklyGoalBudgets).where(eq(weeklyGoalBudgets.weeklyPlanId, plan.id)) : [];
  return { plan, budgets, week };
}
