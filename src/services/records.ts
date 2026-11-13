import "server-only";
import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { AppError } from "@/lib/errors";
import { requireDb, type Database } from "@/db/client";
import {
  aiMemoryEntries,
  calendarItems,
  fixedCommitmentDefinitions,
  goalProgressEntries,
  goalSessions,
  goals,
  planChanges,
  routineDefinitions,
  userProfiles,
  userSettings,
  weeklyGoalBudgets,
  weeklyPlans,
} from "@/db/schema";
import { defaultSettings } from "@/domain/defaults";
import { SettingsSchema, type CreateGoalInput, type SettingsInput } from "@/domain/schemas";

export async function ensureProfile(userId: string, email: string) {
  const db = requireDb();
  const existing = await db.select().from(userProfiles).where(eq(userProfiles.id, userId)).limit(1);
  if (existing[0]) {
    return existing[0];
  }
  await db.insert(userProfiles).values({
    id: userId,
    displayName: email.split("@")[0] || "Użytkownik",
    timezone: "Europe/Warsaw",
    locale: "pl",
  });
  await db.insert(userSettings).values({ userId, settings: defaultSettings });
  return (await db.select().from(userProfiles).where(eq(userProfiles.id, userId)))[0];
}

export async function getProfile(userId: string) {
  const db = requireDb();
  const profile = (await db.select().from(userProfiles).where(eq(userProfiles.id, userId)).limit(1))[0];
  if (!profile) {
    throw new AppError("NOT_FOUND", "Nie znaleziono profilu.", 404);
  }
  return profile;
}

export async function updateProfile(userId: string, input: { displayName?: string; timezone?: string }) {
  const db = requireDb();
  await db.update(userProfiles).set({
    ...(input.displayName ? { displayName: input.displayName } : {}),
    ...(input.timezone ? { timezone: input.timezone } : {}),
    updatedAt: new Date(),
  }).where(eq(userProfiles.id, userId));
  return getProfile(userId);
}

export async function getSettings(userId: string): Promise<SettingsInput> {
  const db = requireDb();
  const row = (await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1))[0];
  if (!row) {
    return defaultSettings;
  }
  const parsed = SettingsSchema.safeParse(row.settings);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", "Zapisane ustawienia są niekompletne.", 500);
  }
  return parsed.data;
}

export async function saveSettings(userId: string, settings: SettingsInput) {
  const db = requireDb();
  const parsed = SettingsSchema.parse(settings);
  await db.update(userSettings).set({ settings: parsed, updatedAt: new Date() }).where(eq(userSettings.userId, userId));
  await recordChange(db, userId, null, "settings", "user", "Zmiana ustawień planowania.", null, { settings: parsed });
  return parsed;
}

export async function listGoals(userId: string) {
  const db = requireDb();
  return db.select().from(goals).where(eq(goals.userId, userId)).orderBy(asc(goals.manualPriority), asc(goals.name));
}

export async function getGoal(userId: string, goalId: string) {
  const db = requireDb();
  const goal = (await db.select().from(goals).where(and(eq(goals.userId, userId), eq(goals.id, goalId))).limit(1))[0];
  if (!goal) {
    throw new AppError("NOT_FOUND", "Nie znaleziono celu.", 404);
  }
  return goal;
}

export async function createGoal(userId: string, input: CreateGoalInput, actor: "user" | "ai" = "user") {
  const db = requireDb();
  const [goal] = await db.insert(goals).values({
    userId,
    name: input.name,
    description: input.description ?? "",
    category: input.category,
    manualPriority: input.manualPriority,
    currentLevel: input.currentLevel ?? null,
    desiredLevel: input.desiredLevel ?? null,
    deadlineAt: input.deadlineAt ? new Date(input.deadlineAt) : null,
    difficulty: input.difficulty,
    difficultyIsEstimate: input.difficultyIsEstimate ?? false,
    progressValue: String(input.progressValue ?? 0),
    progressMethod: input.progressMethod ?? "percent",
    planningNotes: input.planningNotes ?? "",
    aiEstimates: input.difficultyIsEstimate ? { difficulty: { value: input.difficulty, source: actor } } : null,
  }).returning();
  if (!goal) {
    throw new AppError("INTERNAL_ERROR", "Nie udało się zapisać celu.", 500);
  }
  await recordChange(db, userId, null, "goal_created", actor, "Utworzenie celu.", null, { goalId: goal.id, name: goal.name });
  return goal;
}

export async function updateGoal(userId: string, goalId: string, patch: Partial<CreateGoalInput> & { status?: "active" | "paused" | "completed" | "archived" }) {
  const db = requireDb();
  const current = await getGoal(userId, goalId);
  await db.update(goals).set({
    name: patch.name ?? current.name,
    description: patch.description ?? current.description,
    category: patch.category ?? current.category,
    manualPriority: patch.manualPriority ?? current.manualPriority,
    currentLevel: patch.currentLevel === undefined ? current.currentLevel : patch.currentLevel,
    desiredLevel: patch.desiredLevel === undefined ? current.desiredLevel : patch.desiredLevel,
    deadlineAt: patch.deadlineAt === undefined ? current.deadlineAt : patch.deadlineAt ? new Date(patch.deadlineAt) : null,
    difficulty: patch.difficulty ?? current.difficulty,
    difficultyIsEstimate: patch.difficultyIsEstimate ?? current.difficultyIsEstimate,
    progressValue: patch.progressValue === undefined ? current.progressValue : String(patch.progressValue),
    progressMethod: patch.progressMethod ?? current.progressMethod,
    planningNotes: patch.planningNotes ?? current.planningNotes,
    status: patch.status ?? current.status,
    completedAt: patch.status === "completed" ? new Date() : patch.status ? null : current.completedAt,
    updatedAt: new Date(),
  }).where(and(eq(goals.userId, userId), eq(goals.id, goalId)));
  await recordChange(db, userId, null, "goal_updated", "user", "Edycja celu.", { goalId, status: current.status }, { goalId, status: patch.status ?? current.status });
  return getGoal(userId, goalId);
}

export async function addProgress(userId: string, goalId: string, input: { progressValue: number; progressMethod: string; notes?: string; source?: "user" | "ai_assisted" | "imported" }) {
  const db = requireDb();
  await getGoal(userId, goalId);
  await db.insert(goalProgressEntries).values({
    userId,
    goalId,
    progressValue: String(input.progressValue),
    progressUnit: input.progressMethod,
    source: input.source ?? "user",
    notes: input.notes ?? "",
  });
  await db.update(goals).set({
    progressValue: String(input.progressValue),
    progressMethod: input.progressMethod,
    updatedAt: new Date(),
  }).where(and(eq(goals.userId, userId), eq(goals.id, goalId)));
  return listProgress(userId, goalId);
}

export async function listProgress(userId: string, goalId: string) {
  const db = requireDb();
  return db.select().from(goalProgressEntries).where(and(eq(goalProgressEntries.userId, userId), eq(goalProgressEntries.goalId, goalId))).orderBy(desc(goalProgressEntries.reportedAt));
}

export async function listCalendar(userId: string, start: Date, end: Date) {
  const db = requireDb();
  return db.select().from(calendarItems).where(and(
    eq(calendarItems.userId, userId),
    lte(calendarItems.startAt, end),
    gte(calendarItems.endAt, start),
    sql`${calendarItems.status} <> 'cancelled'`,
  )).orderBy(asc(calendarItems.startAt));
}

export async function listRoutines(userId: string) {
  const db = requireDb();
  return db.select().from(routineDefinitions).where(and(eq(routineDefinitions.userId, userId), eq(routineDefinitions.isActive, true)));
}

export async function listCommitments(userId: string) {
  const db = requireDb();
  return db.select().from(fixedCommitmentDefinitions).where(and(eq(fixedCommitmentDefinitions.userId, userId), eq(fixedCommitmentDefinitions.isActive, true)));
}

export async function listChanges(userId: string) {
  const db = requireDb();
  return db.select().from(planChanges).where(eq(planChanges.userId, userId)).orderBy(desc(planChanges.createdAt)).limit(100);
}

export async function listPlans(userId: string) {
  const db = requireDb();
  return db.select().from(weeklyPlans).where(eq(weeklyPlans.userId, userId)).orderBy(desc(weeklyPlans.createdAt)).limit(50);
}

export async function recordChange(
  db: Database,
  userId: string,
  weeklyPlanId: string | null,
  changeType: string,
  actor: "user" | "ai" | "system",
  reason: string,
  beforeSnapshot: unknown,
  afterSnapshot: unknown,
) {
  await db.insert(planChanges).values({
    userId,
    weeklyPlanId,
    changeType,
    actor,
    reason,
    beforeSnapshot,
    afterSnapshot,
  });
}

export async function listSessionsForGoal(userId: string, goalId: string) {
  const db = requireDb();
  return db.select().from(goalSessions).where(and(eq(goalSessions.userId, userId), eq(goalSessions.goalId, goalId))).orderBy(desc(goalSessions.createdAt));
}

export async function listMemory(userId: string) {
  const db = requireDb();
  return db.select().from(aiMemoryEntries).where(eq(aiMemoryEntries.userId, userId)).orderBy(desc(aiMemoryEntries.updatedAt));
}

export async function createRoutine(userId: string, input: {
  title: string;
  durationMinutes: number;
  windowStart: string;
  windowEnd: string;
  daysOfWeek: number[];
  travelMinutes?: number;
  preparationMinutes?: number;
}) {
  const db = requireDb();
  const [row] = await db.insert(routineDefinitions).values({
    userId,
    title: input.title,
    durationMinutes: input.durationMinutes,
    windowStart: input.windowStart,
    windowEnd: input.windowEnd,
    daysOfWeek: input.daysOfWeek,
    travelMinutes: input.travelMinutes ?? 0,
    preparationMinutes: input.preparationMinutes ?? 0,
  }).returning();
  return row;
}

export async function createCommitment(userId: string, input: {
  title: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  travelMinutes?: number;
  preparationMinutes?: number;
}) {
  const db = requireDb();
  const [row] = await db.insert(fixedCommitmentDefinitions).values({
    userId,
    ...input,
    travelMinutes: input.travelMinutes ?? 0,
    preparationMinutes: input.preparationMinutes ?? 0,
  }).returning();
  return row;
}

export async function replaceMemory(userId: string, memoryId: string, content: string, confirmed: boolean) {
  const db = requireDb();
  const current = (await db.select().from(aiMemoryEntries).where(and(eq(aiMemoryEntries.userId, userId), eq(aiMemoryEntries.id, memoryId))).limit(1))[0];
  if (!current) {
    throw new AppError("NOT_FOUND", "Nie znaleziono wpisu pamięci.", 404);
  }
  if (current.sourceType === "explicit_setting") {
    throw new AppError("FORBIDDEN", "Jawnych ustawień nie wolno nadpisać wpisem pamięci.", 403);
  }
  await db.update(aiMemoryEntries).set({
    content: { text: content },
    isUserConfirmed: confirmed,
    sourceType: "user_edit",
    updatedAt: new Date(),
  }).where(eq(aiMemoryEntries.id, memoryId));
}

export async function deleteMemory(userId: string, memoryId: string) {
  const db = requireDb();
  await db.delete(aiMemoryEntries).where(and(eq(aiMemoryEntries.userId, userId), eq(aiMemoryEntries.id, memoryId)));
}

export async function listOpenSessions(userId: string) {
  const db = requireDb();
  return db.select().from(goalSessions).where(and(
    eq(goalSessions.userId, userId),
    sql`${goalSessions.completionStatus} in ('not_started', 'in_progress', 'partial')`,
  )).limit(12);
}

export { weeklyGoalBudgets };
