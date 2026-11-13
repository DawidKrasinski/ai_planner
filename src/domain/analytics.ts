import { averageEfficiency, dailyDifficulty, displayPlanCompletion, effectiveMinutes, planCompletionPercent } from "./metrics";

export type ExecutionRecord = {
  goalId: string;
  goalName: string;
  date: string;
  plannedMinutes: number;
  actualMinutes: number | null;
  efficiencyRating: number | null;
  difficulty: number;
  status: string;
};

export type ProgressPoint = {
  goalId: string;
  date: string;
  value: number;
};

export type PeriodSummary = {
  plannedMinutes: number;
  actualMinutes: number;
  effectiveMinutes: number;
  averageEfficiency: number | null;
  planCompletion: number | null;
  difficulty: number;
  byGoal: {
    goalId: string;
    goalName: string;
    plannedMinutes: number;
    actualMinutes: number;
    effectiveMinutes: number;
  }[];
  byDay: { date: string; difficulty: number; planCompletion: number | null; effectiveMinutes: number }[];
  bestDay: { date: string; difficulty: number } | null;
  worstDay: { date: string; planCompletion: number } | null;
  progress: ProgressPoint[];
};

export function summarizePeriod(
  records: ExecutionRecord[],
  progress: ProgressPoint[],
  capPlanCompletion: boolean,
): PeriodSummary {
  const completed = records.filter((record) => record.actualMinutes !== null && record.efficiencyRating !== null);
  const plannedMinutes = records.reduce((sum, record) => sum + record.plannedMinutes, 0);
  const actualMinutes = completed.reduce((sum, record) => sum + (record.actualMinutes ?? 0), 0);
  const effective = completed.reduce(
    (sum, record) => sum + effectiveMinutes(record.actualMinutes ?? 0, record.efficiencyRating ?? 0),
    0,
  );
  const ratings = completed.map((record) => record.efficiencyRating ?? 0);
  const rawCompletion = planCompletionPercent(
    actualMinutes,
    ratings.length === 0 ? 0 : (averageEfficiency(ratings) ?? 0),
    plannedMinutes,
  );
  const byGoalMap = new Map<string, PeriodSummary["byGoal"][number]>();
  for (const record of records) {
    const current = byGoalMap.get(record.goalId) ?? {
      goalId: record.goalId,
      goalName: record.goalName,
      plannedMinutes: 0,
      actualMinutes: 0,
      effectiveMinutes: 0,
    };
    current.plannedMinutes += record.plannedMinutes;
    if (record.actualMinutes !== null && record.efficiencyRating !== null) {
      current.actualMinutes += record.actualMinutes;
      current.effectiveMinutes += effectiveMinutes(record.actualMinutes, record.efficiencyRating);
    }
    byGoalMap.set(record.goalId, current);
  }
  const byDayMap = new Map<string, ExecutionRecord[]>();
  for (const record of records) {
    const list = byDayMap.get(record.date) ?? [];
    list.push(record);
    byDayMap.set(record.date, list);
  }
  const byDay = [...byDayMap.entries()].map(([date, dayRecords]) => {
    const done = dayRecords.filter((record) => record.actualMinutes !== null && record.efficiencyRating !== null);
    const dayActual = done.reduce((sum, record) => sum + (record.actualMinutes ?? 0), 0);
    const dayPlanned = dayRecords.reduce((sum, record) => sum + record.plannedMinutes, 0);
    const dayRatings = done.map((record) => record.efficiencyRating ?? 0);
    const dayAverage = averageEfficiency(dayRatings) ?? 0;
    return {
      date,
      difficulty: dailyDifficulty(done.map((record) => ({
        actualMinutes: record.actualMinutes ?? 0,
        efficiencyRating: record.efficiencyRating ?? 0,
        difficulty: record.difficulty,
      }))),
      planCompletion: displayPlanCompletion(planCompletionPercent(dayActual, dayAverage, dayPlanned), capPlanCompletion),
      effectiveMinutes: done.reduce(
        (sum, record) => sum + effectiveMinutes(record.actualMinutes ?? 0, record.efficiencyRating ?? 0),
        0,
      ),
    };
  });
  const bestDay = [...byDay].sort((left, right) => right.difficulty - left.difficulty)[0] ?? null;
  const worstDay = [...byDay]
    .filter((day) => day.planCompletion !== null)
    .sort((left, right) => (left.planCompletion ?? 0) - (right.planCompletion ?? 0))[0] ?? null;
  return {
    plannedMinutes,
    actualMinutes,
    effectiveMinutes: effective,
    averageEfficiency: averageEfficiency(ratings),
    planCompletion: displayPlanCompletion(rawCompletion, capPlanCompletion),
    difficulty: dailyDifficulty(completed.map((record) => ({
      actualMinutes: record.actualMinutes ?? 0,
      efficiencyRating: record.efficiencyRating ?? 0,
      difficulty: record.difficulty,
    }))),
    byGoal: [...byGoalMap.values()],
    byDay,
    bestDay: bestDay ? { date: bestDay.date, difficulty: bestDay.difficulty } : null,
    worstDay: worstDay?.planCompletion != null ? { date: worstDay.date, planCompletion: worstDay.planCompletion } : null,
    progress,
  };
}
