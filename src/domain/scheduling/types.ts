export const ENGINE_VERSION = "1.0.0";

export const goalCategories = ["training", "learning_work", "leisure"] as const;
export type GoalCategory = (typeof goalCategories)[number];

export type BlockKind =
  | "goal_session"
  | "fixed_commitment"
  | "one_off_event"
  | "routine_occurrence"
  | "flexible_task"
  | "meal"
  | "transition"
  | "break"
  | "travel"
  | "preparation";

export type HardBlockInput = {
  id: string;
  title: string;
  start: number;
  end: number;
  kind?: BlockKind;
  travelMinutes?: number;
  preparationMinutes?: number;
  locked?: boolean;
  preserved?: boolean;
  goalId?: string;
};

export type RoutineInput = {
  id: string;
  title: string;
  durationMinutes: number;
  windowStart: string;
  windowEnd: string;
  daysOfWeek: number[];
  travelMinutes?: number;
  preparationMinutes?: number;
};

export type FlexibleTaskInput = {
  id: string;
  title: string;
  durationMinutes: number;
  windowStart: number;
  windowEnd: number;
  priority: number;
};

export type MealInput = {
  id: string;
  title: string;
  time: string;
  durationMinutes: number;
};

export type GoalScheduleInput = {
  id: string;
  title: string;
  category: GoalCategory;
  manualPriority: number;
  urgency: number;
  requestedMinutes: number;
  minSessionMinutes: number;
  maxSessionMinutes: number;
  preferredSessionMinutes: number;
  allowTrainingBorrow: boolean;
  allowSleepBorrow: boolean;
};

export type PlanningInput = {
  periodStart: string;
  periodEnd: string;
  timezone: string;
  wakeTime: string;
  sleepTime: string;
  transitionMinutes: number;
  breakAfterMinutes: number;
  breakMinutes: number;
  minUsefulSessionMinutes: number;
  categoryBudgets: Record<GoalCategory, number>;
  priorityBorrowCaps: Record<"1" | "2" | "3" | "4" | "5" | "6", number | null>;
  sleepBorrowMaxMinutes: number;
  goals: GoalScheduleInput[];
  hardBlocks: HardBlockInput[];
  routines: RoutineInput[];
  flexibleTasks: FlexibleTaskInput[];
  meals: MealInput[];
  previousBlocks?: ScheduledBlock[];
};

export type ScheduledBlock = {
  id: string;
  kind: BlockKind;
  title: string;
  start: number;
  end: number;
  goalId?: string;
  sourceId?: string;
  chargedCategory?: GoalCategory | "sleep";
  reason: string;
  fixed: boolean;
  locked: boolean;
  preserved: boolean;
};

export type BorrowRecord = {
  goalId: string;
  from: GoalCategory | "sleep";
  minutes: number;
  reason: string;
};

export type ScheduleResult = {
  blocks: ScheduledBlock[];
  unscheduledMinutes: { goalId: string; minutes: number; reason: string }[];
  unplacedRoutines: string[];
  violations: string[];
  warnings: string[];
  categoryTotals: Record<GoalCategory, number>;
  goalTotals: Record<string, number>;
  borrowed: BorrowRecord[];
  sleepBorrowedMinutes: number;
  validation: { ok: boolean };
  engineVersion: string;
  changes: { added: string[]; removed: string[]; moved: string[] };
};
