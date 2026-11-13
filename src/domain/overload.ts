export type OverloadConfig = {
  lowCompletionThreshold: number;
  consecutiveLowDays: number;
  highLoadMinutes: number;
  autoReducePriorities: number[];
  askBeforePriorities: number[];
};

export const defaultOverloadConfig: OverloadConfig = {
  lowCompletionThreshold: 60,
  consecutiveLowDays: 3,
  highLoadMinutes: 2400,
  autoReducePriorities: [1, 2],
  askBeforePriorities: [3, 4],
};

export type OverloadGoal = {
  id: string;
  manualPriority: number;
  plannedMinutes: number;
};

export type OverloadAssessment = {
  severity: "none" | "low" | "moderate" | "high";
  action: "none" | "reduce" | "ask";
  reason: string;
  reductions: { goalId: string; fromMinutes: number; toMinutes: number }[];
};

export function assessOverload(input: {
  recentCompletion: number[];
  scheduledMinutes: number;
  goals: OverloadGoal[];
  sleepPressure: boolean;
  config?: OverloadConfig;
}): OverloadAssessment {
  const config = input.config ?? defaultOverloadConfig;
  const lowDays = trailingLowDays(input.recentCompletion, config.lowCompletionThreshold);
  const overloaded =
    lowDays >= config.consecutiveLowDays ||
    input.scheduledMinutes > config.highLoadMinutes ||
    input.sleepPressure;
  if (!overloaded) {
    return { severity: "none", action: "none", reason: "Obciążenie mieści się w limitach.", reductions: [] };
  }
  const highImpact = input.goals.some((goal) => goal.manualPriority >= 5) && input.sleepPressure;
  if (highImpact) {
    return {
      severity: "high",
      action: "ask",
      reason: "Wysoki priorytet koliduje z ochroną snu. Potrzebna jest decyzja użytkownika.",
      reductions: [],
    };
  }
  const moderate = input.goals.some((goal) => config.askBeforePriorities.includes(goal.manualPriority));
  const reductions = input.goals
    .filter((goal) => config.autoReducePriorities.includes(goal.manualPriority) && goal.plannedMinutes > 0)
    .map((goal) => ({
      goalId: goal.id,
      fromMinutes: goal.plannedMinutes,
      toMinutes: Math.floor(goal.plannedMinutes * 0.7),
    }));
  if (moderate && reductions.length === 0) {
    return {
      severity: "moderate",
      action: "ask",
      reason: "Obciążenie dotyczy priorytetów, których nie wolno ściąć automatycznie.",
      reductions: [],
    };
  }
  if (reductions.length > 0) {
    return {
      severity: moderate ? "moderate" : "low",
      action: "reduce",
      reason: "Obniżono budżet celów o niskim priorytecie.",
      reductions,
    };
  }
  return {
    severity: "moderate",
    action: "ask",
    reason: "Nie ma celu o niskim priorytecie, który można bezpiecznie skrócić.",
    reductions: [],
  };
}

function trailingLowDays(values: number[], threshold: number): number {
  let count = 0;
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const value = values[index];
    if (value === undefined || value >= threshold) {
      break;
    }
    count += 1;
  }
  return count;
}
