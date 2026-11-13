import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { SettingsInput } from "@/domain/schemas";

export const goalCategory = pgEnum("goal_category", ["training", "learning_work", "leisure"]);
export const goalStatus = pgEnum("goal_status", ["active", "paused", "completed", "archived"]);
export const calendarItemType = pgEnum("calendar_item_type", [
  "goal_session",
  "one_off_event",
  "routine_occurrence",
  "fixed_commitment",
  "flexible_task",
  "meal",
  "transition",
  "break",
  "travel",
  "preparation",
]);
export const calendarItemStatus = pgEnum("calendar_item_status", [
  "scheduled",
  "completed",
  "partial",
  "skipped",
  "cancelled",
]);
export const sessionStatus = pgEnum("session_status", [
  "not_started",
  "in_progress",
  "partial",
  "completed",
  "skipped",
]);
export const planStatus = pgEnum("plan_status", ["draft", "active", "superseded", "restored"]);
export const changeActor = pgEnum("change_actor", ["user", "ai", "system"]);
export const jobStatus = pgEnum("job_status", ["pending", "running", "succeeded", "failed"]);
export const progressSource = pgEnum("progress_source", ["user", "ai_assisted", "imported"]);

export const userProfiles = pgTable(
  "user_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    singleton: boolean("singleton").notNull().default(true),
    displayName: text("display_name").notNull(),
    timezone: text("timezone").notNull().default("Europe/Warsaw"),
    locale: text("locale").notNull().default("pl"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("user_profiles_singleton").on(table.singleton)],
);

export const userSettings = pgTable(
  "user_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    singleton: boolean("singleton").notNull().default(true),
    settings: jsonb("settings").$type<SettingsInput>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("user_settings_singleton").on(table.singleton)],
);

export const goals = pgTable("goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  category: goalCategory("category").notNull(),
  manualPriority: integer("manual_priority").notNull(),
  currentLevel: text("current_level"),
  desiredLevel: text("desired_level"),
  deadlineAt: timestamp("deadline_at", { withTimezone: true }),
  difficulty: integer("difficulty").notNull(),
  difficultyIsEstimate: boolean("difficulty_is_estimate").notNull().default(false),
  progressValue: numeric("progress_value").notNull().default("0"),
  progressMethod: text("progress_method").notNull().default("percent"),
  status: goalStatus("status").notNull().default("active"),
  aiEstimates: jsonb("ai_estimates"),
  planningNotes: text("planning_notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const goalProgressEntries = pgTable("goal_progress_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  goalId: uuid("goal_id").notNull(),
  progressValue: numeric("progress_value").notNull(),
  progressUnit: text("progress_unit").notNull(),
  reportedAt: timestamp("reported_at", { withTimezone: true }).notNull().defaultNow(),
  source: progressSource("source").notNull().default("user"),
  notes: text("notes").notNull().default(""),
});

export const routineDefinitions = pgTable("routine_definitions", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  windowStart: text("window_start").notNull(),
  windowEnd: text("window_end").notNull(),
  daysOfWeek: integer("days_of_week").array().notNull(),
  travelMinutes: integer("travel_minutes").notNull().default(0),
  preparationMinutes: integer("preparation_minutes").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const fixedCommitmentDefinitions = pgTable("fixed_commitment_definitions", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  daysOfWeek: integer("days_of_week").array().notNull(),
  travelMinutes: integer("travel_minutes").notNull().default(0),
  preparationMinutes: integer("preparation_minutes").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const weeklyPlans = pgTable(
  "weekly_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    versionNumber: integer("version_number").notNull(),
    status: planStatus("status").notNull().default("draft"),
    generationReason: text("generation_reason").notNull(),
    aiSummary: text("ai_summary").notNull().default(""),
    engineVersion: text("engine_version").notNull(),
    engineDiagnostics: jsonb("engine_diagnostics").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("plans_period_version").on(table.periodStart, table.versionNumber)],
);

export const weeklyGoalBudgets = pgTable("weekly_goal_budgets", {
  id: uuid("id").primaryKey().defaultRandom(),
  weeklyPlanId: uuid("weekly_plan_id").notNull(),
  goalId: uuid("goal_id").notNull(),
  plannedMinutes: integer("planned_minutes").notNull(),
  reason: text("reason").notNull(),
  borrowedFromCategory: text("borrowed_from_category"),
  confidence: numeric("confidence"),
});

export const calendarItems = pgTable("calendar_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  itemType: calendarItemType("item_type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }).notNull(),
  timezone: text("timezone").notNull(),
  isFixed: boolean("is_fixed").notNull().default(false),
  isUserLocked: boolean("is_user_locked").notNull().default(false),
  sourceGoalId: uuid("source_goal_id"),
  routineDefinitionId: uuid("routine_definition_id"),
  commitmentDefinitionId: uuid("commitment_definition_id"),
  weeklyPlanId: uuid("weekly_plan_id"),
  flexibleWindowStart: timestamp("flexible_window_start", { withTimezone: true }),
  flexibleWindowEnd: timestamp("flexible_window_end", { withTimezone: true }),
  travelMinutes: integer("travel_minutes").notNull().default(0),
  preparationMinutes: integer("preparation_minutes").notNull().default(0),
  status: calendarItemStatus("status").notNull().default("scheduled"),
  placementReason: text("placement_reason").notNull().default(""),
  aiGenerated: boolean("ai_generated").notNull().default(false),
  externalId: text("external_id"),
  externalEtag: text("external_etag"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const goalSessions = pgTable("goal_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  goalId: uuid("goal_id").notNull(),
  calendarItemId: uuid("calendar_item_id"),
  plannedMinutes: integer("planned_minutes").notNull(),
  actualMinutes: integer("actual_minutes"),
  efficiencyRating: integer("efficiency_rating"),
  effectiveMinutes: numeric("effective_minutes"),
  difficultySnapshot: integer("difficulty_snapshot").notNull(),
  prioritySnapshot: integer("priority_snapshot").notNull(),
  completionStatus: sessionStatus("completion_status").notNull().default("not_started"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const planChanges = pgTable("plan_changes", {
  id: uuid("id").primaryKey().defaultRandom(),
  weeklyPlanId: uuid("weekly_plan_id"),
  changeType: text("change_type").notNull(),
  actor: changeActor("actor").notNull(),
  beforeSnapshot: jsonb("before_snapshot"),
  afterSnapshot: jsonb("after_snapshot"),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const aiMemoryEntries = pgTable("ai_memory_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  memoryType: text("memory_type").notNull(),
  content: jsonb("content").notNull(),
  sourceType: text("source_type").notNull(),
  sourceReference: text("source_reference"),
  confidence: numeric("confidence").notNull().default("1"),
  isUserConfirmed: boolean("is_user_confirmed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  lastObservedAt: timestamp("last_observed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const aiConversations = pgTable("ai_conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  screen: text("screen").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const aiMessages = pgTable("ai_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  structured: jsonb("structured"),
  provider: text("provider").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const backgroundJobs = pgTable("background_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobType: text("job_type").notNull(),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  status: jobStatus("status").notNull().default("pending"),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  resultSummary: jsonb("result_summary"),
  errorCode: text("error_code"),
  errorDetails: text("error_details"),
  attemptCount: integer("attempt_count").notNull().default(0),
});

export const integrationConnections = pgTable("integration_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  provider: text("provider").notNull(),
  encryptedRefreshToken: text("encrypted_refresh_token"),
  scopes: text("scopes").array().notNull().default(sql`'{}'::text[]`),
  status: text("status").notNull(),
  exportEnabled: boolean("export_enabled").notNull().default(false),
  connectedAt: timestamp("connected_at", { withTimezone: true }),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  lastError: text("last_error"),
}, (table) => [uniqueIndex("integration_provider").on(table.provider)]);

export const rateLimitBuckets = pgTable("rate_limit_buckets", {
  bucketKey: text("bucket_key").notNull(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  requestCount: integer("request_count").notNull(),
});
