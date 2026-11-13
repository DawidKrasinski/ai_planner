import type { GoalCategory } from "./scheduling/types";

export type BudgetGoal = {
  id: string;
  category: GoalCategory;
  urgency: number;
  manualPriority: number;
};

export type BaselineBudget = {
  goalId: string;
  minutes: number;
  reason: string;
  allowTrainingBorrow: boolean;
  allowSleepBorrow: boolean;
};

export function allocateBaselineBudgets(
  goals: BudgetGoal[],
  categoryBudgets: Record<GoalCategory, number>,
): BaselineBudget[] {
  const active = [...goals].sort((left, right) => right.urgency - left.urgency || left.id.localeCompare(right.id));
  const byCategory = new Map<GoalCategory, BudgetGoal[]>();
  for (const goal of active) {
    const list = byCategory.get(goal.category) ?? [];
    list.push(goal);
    byCategory.set(goal.category, list);
  }
  const result: BaselineBudget[] = [];
  for (const [category, members] of byCategory) {
    const budget = categoryBudgets[category];
    const weight = members.reduce((sum, goal) => sum + Math.max(goal.urgency, 1), 0);
    let assigned = 0;
    const shares = members.map((goal) => {
      const raw = Math.floor((budget * Math.max(goal.urgency, 1)) / weight);
      assigned += raw;
      return { goal, minutes: raw };
    });
    let remainder = budget - assigned;
    for (const share of shares) {
      if (remainder <= 0) {
        break;
      }
      share.minutes += 1;
      remainder -= 1;
    }
    for (const share of shares) {
      result.push({
        goalId: share.goal.id,
        minutes: share.minutes,
        reason: "Bazowy podział budżetu kategorii według pilności. To nie jest decyzja modelu AI.",
        allowTrainingBorrow: share.goal.manualPriority >= 6,
        allowSleepBorrow: false,
      });
    }
  }
  return result;
}

export function applyMinuteOverrides(
  budgets: BaselineBudget[],
  overrides: Record<string, number> | undefined,
): BaselineBudget[] {
  if (!overrides) {
    return budgets;
  }
  return budgets.map((budget) => {
    const minutes = overrides[budget.goalId];
    if (minutes === undefined) {
      return budget;
    }
    return {
      ...budget,
      minutes,
      reason: `${budget.reason} Przegląd tygodnia ustawił budżet na ${minutes} min.`,
    };
  });
}
