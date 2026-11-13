import { describe, expect, it } from "vitest";
import { allocateBaselineBudgets, applyMinuteOverrides } from "./budgets";

describe("baseline budgets", () => {
  it("splits a category budget in proportion to urgency", () => {
    const budgets = allocateBaselineBudgets(
      [
        { id: "low", category: "learning_work", urgency: 100, manualPriority: 2 },
        { id: "high", category: "learning_work", urgency: 300, manualPriority: 4 },
      ],
      { training: 0, learning_work: 400, leisure: 0 },
    );
    expect(budgets).toEqual([
      expect.objectContaining({ goalId: "high", minutes: 300 }),
      expect.objectContaining({ goalId: "low", minutes: 100 }),
    ]);
    expect(budgets.every((item) => item.allowSleepBorrow === false)).toBe(true);
  });

  it("applies a weekly-review reduction only to the listed goals", () => {
    const chosen = allocateBaselineBudgets(
      [{ id: "easy", category: "leisure", urgency: 100, manualPriority: 1 }],
      { training: 0, learning_work: 0, leisure: 100 },
    );
    const adjusted = applyMinuteOverrides(chosen, { easy: 70, missing: 10 });
    expect(adjusted).toEqual([
      expect.objectContaining({
        goalId: "easy",
        minutes: 70,
        reason: expect.stringContaining("70 min"),
      }),
    ]);
  });
});
