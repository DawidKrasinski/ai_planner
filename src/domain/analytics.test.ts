import { describe, expect, it } from "vitest";
import { summarizePeriod } from "./analytics";

describe("period summary", () => {
  it("keeps effective time, plan completion, and goal progress separate", () => {
    const summary = summarizePeriod(
      [
        {
          goalId: "goal-1",
          goalName: "Angielski",
          date: "2026-11-13",
          plannedMinutes: 180,
          actualMinutes: 120,
          efficiencyRating: 5,
          difficulty: 7,
          status: "partial",
        },
      ],
      [{ goalId: "goal-1", date: "2026-11-13", value: 40 }],
      false,
    );
    expect(summary.effectiveMinutes).toBe(60);
    expect(summary.planCompletion).toBeCloseTo(33.333, 2);
    expect(summary.difficulty).toBeCloseTo(7, 5);
    expect(summary.progress).toEqual([{ goalId: "goal-1", date: "2026-11-13", value: 40 }]);
    expect(summary.byGoal[0]?.goalName).toBe("Angielski");
  });

  it("returns an empty summary without inventing execution", () => {
    const summary = summarizePeriod([], [], false);
    expect(summary.actualMinutes).toBe(0);
    expect(summary.averageEfficiency).toBeNull();
    expect(summary.bestDay).toBeNull();
  });
});
