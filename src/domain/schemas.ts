import { z } from "zod";

export const GoalCategorySchema = z.enum(["training", "learning_work", "leisure"]);
export const GoalStatusSchema = z.enum(["active", "paused", "completed", "archived"]);
export const SessionStatusSchema = z.enum([
  "not_started",
  "in_progress",
  "partial",
  "completed",
  "skipped",
]);
export const ProgressSourceSchema = z.enum(["user", "ai_assisted", "imported"]);

const timeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Godzina w formacie HH:mm");

export const CreateGoalSchema = z
  .strictObject({
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().max(5000).optional(),
    category: GoalCategorySchema,
    manualPriority: z.number().int().min(1).max(6),
    currentLevel: z.string().trim().max(500).nullable().optional(),
    desiredLevel: z.string().trim().max(500).nullable().optional(),
    deadlineAt: z.iso.datetime().nullable().optional(),
    difficulty: z.number().int().min(1).max(10),
    difficultyIsEstimate: z.boolean().optional(),
    progressValue: z.number().min(0).optional(),
    progressMethod: z.string().trim().min(1).max(200).optional(),
    planningNotes: z.string().trim().max(5000).optional(),
  })
  .superRefine((value, context) => {
    const method = value.progressMethod ?? "percent";
    const progress = value.progressValue ?? 0;
    if (method === "percent" && progress > 100) {
      context.addIssue({
        code: "custom",
        path: ["progressValue"],
        message: "Postęp procentowy mieści się w zakresie 0–100.",
      });
    }
  });

export const UpdateGoalSchema = z.strictObject({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5000).optional(),
  category: GoalCategorySchema.optional(),
  manualPriority: z.number().int().min(1).max(6).optional(),
  currentLevel: z.string().trim().max(500).nullable().optional(),
  desiredLevel: z.string().trim().max(500).nullable().optional(),
  deadlineAt: z.iso.datetime().nullable().optional(),
  difficulty: z.number().int().min(1).max(10).optional(),
  difficultyIsEstimate: z.boolean().optional(),
  progressValue: z.number().min(0).max(100).optional(),
  progressMethod: z.string().trim().min(1).max(200).optional(),
  planningNotes: z.string().trim().max(5000).optional(),
  status: GoalStatusSchema.optional(),
});

export const ProgressEntrySchema = z.strictObject({
  progressValue: z.number(),
  progressMethod: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(5000).optional(),
  source: ProgressSourceSchema.optional(),
});

export const MealSchema = z.strictObject({
  id: z.string().trim().min(1).max(40),
  title: z.string().trim().min(1).max(80),
  time: timeOfDay,
  durationMinutes: z.number().int().min(5).max(180),
});

export const SettingsSchema = z.strictObject({
  wakeTime: timeOfDay,
  sleepTime: timeOfDay,
  transitionMinutes: z.number().int().min(0).max(60),
  breakAfterMinutes: z.number().int().min(30).max(240),
  breakMinutes: z.number().int().min(5).max(60),
  minUsefulSessionMinutes: z.number().int().min(15).max(120),
  sleepBorrowMaxMinutes: z.number().int().min(0).max(120),
  capPlanCompletion: z.boolean(),
  categoryBudgets: z.strictObject({
    training: z.number().int().min(0).max(10080),
    learning_work: z.number().int().min(0).max(10080),
    leisure: z.number().int().min(0).max(10080),
  }),
  priorityBorrowCaps: z.strictObject({
    "1": z.number().int().min(0).nullable(),
    "2": z.number().int().min(0).nullable(),
    "3": z.number().int().min(0).nullable(),
    "4": z.number().int().min(0).nullable(),
    "5": z.number().int().min(0).nullable(),
    "6": z.number().int().min(0).nullable(),
  }),
  meals: z.array(MealSchema).max(6),
  urgency: z.strictObject({
    priorityWeight: z.number().positive().max(1000),
    deadlineWindowDays: z.number().int().min(1).max(365),
    deadlineBoost: z.number().min(0).max(1000),
  }),
  overload: z.strictObject({
    lowCompletionThreshold: z.number().min(0).max(100),
    consecutiveLowDays: z.number().int().min(1).max(14),
    highLoadMinutes: z.number().int().min(60).max(10080),
    autoReducePriorities: z.array(z.number().int().min(1).max(6)).max(6),
    askBeforePriorities: z.array(z.number().int().min(1).max(6)).max(6),
  }),
  googleExportEnabled: z.boolean(),
});

export const CalendarItemSchema = z.strictObject({
  itemType: z.enum(["one_off_event", "fixed_commitment", "routine_occurrence", "flexible_task"]),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional(),
  startAt: z.iso.datetime(),
  endAt: z.iso.datetime(),
  isFixed: z.boolean(),
  flexibleWindowStart: z.iso.datetime().nullable().optional(),
  flexibleWindowEnd: z.iso.datetime().nullable().optional(),
  travelMinutes: z.number().int().min(0).max(240).optional(),
  preparationMinutes: z.number().int().min(0).max(240).optional(),
  routineDefinitionId: z.uuid().nullable().optional(),
  commitmentDefinitionId: z.uuid().nullable().optional(),
});

export const CompleteSessionSchema = z.strictObject({
  actualMinutes: z.number().int().min(0).max(1440),
  efficiencyRating: z.number().int().min(1).max(10),
  completionStatus: z.enum(["partial", "completed", "skipped"]),
  notes: z.string().trim().max(5000).optional(),
  progressValue: z.number().min(0).max(100).optional(),
  pullForward: z.boolean().optional(),
});

export const RoutineSchema = z.strictObject({
  title: z.string().trim().min(1).max(200),
  durationMinutes: z.number().int().min(5).max(240),
  windowStart: timeOfDay,
  windowEnd: timeOfDay,
  daysOfWeek: z.array(z.number().int().min(1).max(7)).min(1).max(7),
  travelMinutes: z.number().int().min(0).max(180).optional(),
  preparationMinutes: z.number().int().min(0).max(180).optional(),
});

export const CommitmentSchema = z.strictObject({
  title: z.string().trim().min(1).max(200),
  startTime: timeOfDay,
  endTime: timeOfDay,
  daysOfWeek: z.array(z.number().int().min(1).max(7)).min(1).max(7),
  travelMinutes: z.number().int().min(0).max(180).optional(),
  preparationMinutes: z.number().int().min(0).max(180).optional(),
});

export const AssistantRequestSchema = z.strictObject({
  message: z.string().trim().min(1).max(4000),
  screen: z.enum(["dashboard", "calendar", "goals", "statistics", "settings", "history"]),
});

export const GoalDraftSchema = z.strictObject({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000),
  category: GoalCategorySchema,
  manualPriority: z.number().int().min(1).max(6),
  difficulty: z.number().int().min(1).max(10),
  difficultyIsEstimate: z.boolean(),
  progressMethod: z.string().trim().min(1).max(200),
  currentLevel: z.string().trim().max(500).nullable(),
  desiredLevel: z.string().trim().max(500).nullable(),
  deadlineAt: z.iso.datetime().nullable(),
  planningNotes: z.string().trim().max(5000),
  questions: z.array(z.string().trim().min(1).max(300)).max(4),
});

export const AssistantOutputSchema = z.strictObject({
  reply: z.string().trim().min(1).max(4000),
  proposal: z
    .discriminatedUnion("type", [
      z.strictObject({ type: z.literal("none") }),
      z.strictObject({ type: z.literal("goal_draft"), draft: GoalDraftSchema }),
      z.strictObject({
        type: z.literal("event_draft"),
        title: z.string().trim().min(1).max(200),
        startAt: z.iso.datetime(),
        endAt: z.iso.datetime(),
        isFixed: z.boolean(),
      }),
      z.strictObject({
        type: z.literal("clarification"),
        questions: z.array(z.string().trim().min(1).max(300)).min(1).max(4),
      }),
    ])
    .optional(),
});

export const BudgetProposalSchema = z.strictObject({
  goals: z.array(z.strictObject({
    goalId: z.uuid(),
    minutes: z.number().int().min(0).max(10080),
    rationale: z.string().trim().min(1).max(500),
    confidence: z.number().min(0).max(1),
    allowTrainingBorrow: z.boolean(),
    allowSleepBorrow: z.boolean(),
    needsClarification: z.boolean(),
  })).max(100),
  summary: z.string().trim().max(2000),
});

export const MemoryUpdateSchema = z.strictObject({
  content: z.string().trim().min(1).max(2000),
  isUserConfirmed: z.boolean().optional(),
});

export type CreateGoalInput = z.infer<typeof CreateGoalSchema>;
export type SettingsInput = z.infer<typeof SettingsSchema>;
export type AssistantOutput = z.infer<typeof AssistantOutputSchema>;
export type GoalDraft = z.infer<typeof GoalDraftSchema>;
export type BudgetProposal = z.infer<typeof BudgetProposalSchema>;
