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

export async function ensureProfile() {
  const db = requireDb();
  const existing = (await db.select().from(userProfiles).limit(1))[0];
  if (existing) {
    const settings = (await db.select().from(userSettings).limit(1))[0];
    if (!settings) {
      await db.insert(userSettings).values({ settings: defaultSettings });
    }
    return existing;
  }
  const [profile] = await db.insert(userProfiles).values({
    displayName: "Profil",
    timezone: "Europe/Warsaw",
    locale: "pl",
  }).returning();
  if (!profile) {
    throw new AppError("INTERNAL_ERROR", "Nie udało się utworzyć profilu.", 500);
  }
  await db.insert(userSettings).values({ settings: defaultSettings });
  return profile;
}

export async function getProfile() {
  return ensureProfile();
}

export async function updateProfile(input: { displayName?: string; timezone?: string }) {
  const db = requireDb();
  const profile = await ensureProfile();
  await db.update(userProfiles).set({
    ...(input.displayName ? { displayName: input.displayName } : {}),
    ...(input.timezone ? { timezone: input.timezone } : {}),
    updatedAt: new Date(),
  }).where(eq(userProfiles.id, profile.id));
  return (await db.select().from(userProfiles).where(eq(userProfiles.id, profile.id)))[0];
}

export async function getSettings(): Promise<SettingsInput> {
  const db = requireDb();
  await ensureProfile();
  const row = (await db.select().from(userSettings).limit(1))[0];
  if (!row) {
    return defaultSettings;
  }
  const parsed = SettingsSchema.safeParse(row.settings);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", "Zapisane ustawienia są niekompletne.", 500);
  }
  return parsed.data;
}

export async function saveSettings(settings: SettingsInput) {
  const db = requireDb();
  const parsed = SettingsSchema.parse(settings);
  await ensureProfile();
  await db.update(userSettings).set({ settings: parsed, updatedAt: new Date() });
  await recordChange(db, null, "settings", "user", "Zmiana ustawień planowania.", null, { settings: parsed });
  return parsed;
}

export async function listGoals() {
  const db = requireDb();
  return db.select().from(goals).orderBy(asc(goals.manualPriority), asc(goals.name));
}

export async function getGoal(goalId: string) {
  const db = requireDb();
  const goal = (await db.select().from(goals).where(eq(goals.id, goalId)).limit(1))[0];
  if (!goal) {
    throw new AppError("NOT_FOUND", "Nie znaleziono celu.", 404);
  }
  return goal;
}

export async function createGoal(input: CreateGoalInput, actor: "user" | "ai" = "user") {
  const db = requireDb();
  const [goal] = await db.insert(goals).values({
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
  await recordChange(db, null, "goal_created", actor, "Utworzenie celu.", null, { goalId: goal.id, name: goal.name });
  return goal;
}

export async function updateGoal(goalId: string, patch: Partial<CreateGoalInput> & { status?: "active" | "paused" | "completed" | "archived" }) {
  const db = requireDb();
  const current = await getGoal(goalId);
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
  }).where(eq(goals.id, goalId));
  await recordChange(db, null, "goal_updated", "user", "Edycja celu.", { goalId, status: current.status }, { goalId, status: patch.status ?? current.status });
  return getGoal(goalId);
}

export async function addProgress(goalId: string, input: { progressValue: number; progressMethod: string; notes?: string; source?: "user" | "ai_assisted" | "imported" }) {
  const db = requireDb();
  await getGoal(goalId);
  await db.insert(goalProgressEntries).values({
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
  }).where(eq(goals.id, goalId));
  return listProgress(goalId);
}

export async function listProgress(goalId: string) {
  const db = requireDb();
  return db.select().from(goalProgressEntries).where(eq(goalProgressEntries.goalId, goalId)).orderBy(desc(goalProgressEntries.reportedAt));
}

export async function listCalendar(start: Date, end: Date) {
  const db = requireDb();
  return db.select().from(calendarItems).where(and(
    lte(calendarItems.startAt, end),
    gte(calendarItems.endAt, start),
    sql`${calendarItems.status} <> 'cancelled'`,
  )).orderBy(asc(calendarItems.startAt));
}

export async function listRoutines() {
  const db = requireDb();
  return db.select().from(routineDefinitions).where(eq(routineDefinitions.isActive, true));
}

export async function listCommitments() {
  const db = requireDb();
  return db.select().from(fixedCommitmentDefinitions).where(eq(fixedCommitmentDefinitions.isActive, true));
}

export async function listChanges() {
  const db = requireDb();
  return db.select().from(planChanges).orderBy(desc(planChanges.createdAt)).limit(100);
}

export async function listPlans() {
  const db = requireDb();
  return db.select().from(weeklyPlans).orderBy(desc(weeklyPlans.createdAt)).limit(50);
}

export async function recordChange(
  db: Database,
  weeklyPlanId: string | null,
  changeType: string,
  actor: "user" | "ai" | "system",
  reason: string,
  beforeSnapshot: unknown,
  afterSnapshot: unknown,
) {
  await db.insert(planChanges).values({
    weeklyPlanId,
    changeType,
    actor,
    reason,
    beforeSnapshot,
    afterSnapshot,
  });
}

export async function listSessionsForGoal(goalId: string) {
  const db = requireDb();
  return db.select().from(goalSessions).where(eq(goalSessions.goalId, goalId)).orderBy(desc(goalSessions.createdAt));
}

export async function listMemory() {
  const db = requireDb();
  return db.select().from(aiMemoryEntries).orderBy(desc(aiMemoryEntries.updatedAt));
}

export async function createRoutine(input: {
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

export async function createCommitment(input: {
  title: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  travelMinutes?: number;
  preparationMinutes?: number;
}) {
  const db = requireDb();
  const [row] = await db.insert(fixedCommitmentDefinitions).values({
    ...input,
    travelMinutes: input.travelMinutes ?? 0,
    preparationMinutes: input.preparationMinutes ?? 0,
  }).returning();
  return row;
}

export async function replaceMemory(memoryId: string, content: string, confirmed: boolean) {
  const db = requireDb();
  const current = (await db.select().from(aiMemoryEntries).where(eq(aiMemoryEntries.id, memoryId)).limit(1))[0];
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

export async function deleteMemory(memoryId: string) {
  const db = requireDb();
  await db.delete(aiMemoryEntries).where(eq(aiMemoryEntries.id, memoryId));
}

export async function listOpenSessions() {
  const db = requireDb();
  return db.select().from(goalSessions).where(
    sql`${goalSessions.completionStatus} in ('not_started', 'in_progress', 'partial')`,
  ).limit(12);
}

export { weeklyGoalBudgets };
