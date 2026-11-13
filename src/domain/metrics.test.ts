import { describe, expect, it } from "vitest";
import {
  averageEfficiency,
  consistencyStreak,
  dailyDifficulty,
  displayPlanCompletion,
  effectiveMinutes,
  planCompletionPercent,
} from "./metrics";

describe("effective time", () => {
  it("multiplies actual time by the efficiency rating over 10", () => {
    expect(effectiveMinutes(180, 5)).toBe(90);
    expect(effectiveMinutes(60, 10)).toBe(60);
    expect(effectiveMinutes(45, 1)).toBe(4.5);
  });
});

describe("plan completion", () => {
  it("uses actual time, efficiency, and planned time", () => {
    const value = planCompletionPercent(120, 5, 180);
    expect(value).toBeCloseTo(33.333, 2);
  });

  it("returns null when nothing was planned", () => {
    expect(planCompletionPercent(30, 8, 0)).toBeNull();
  });

  it("stores values above 100 and can cap them for display", () => {
    const raw = planCompletionPercent(180, 10, 60);
    expect(raw).toBe(300);
    expect(displayPlanCompletion(raw, false)).toBe(300);
    expect(displayPlanCompletion(raw, true)).toBe(100);
  });
});

describe("daily difficulty", () => {
  it("sums actual hours, efficiency, and the difficulty snapshot", () => {
    expect(
      dailyDifficulty([{ actualMinutes: 180, efficiencyRating: 5, difficulty: 7 }]),
    ).toBeCloseTo(10.5, 5);
  });

  it("does not use manual priority", () => {
    const lowPriority = dailyDifficulty([
      { actualMinutes: 60, efficiencyRating: 10, difficulty: 4 },
    ]);
    const highDifficulty = dailyDifficulty([
      { actualMinutes: 60, efficiencyRating: 10, difficulty: 8 },
    ]);
    expect(highDifficulty).toBeGreaterThan(lowPriority);
    expect(lowPriority).toBe(4);
  });
});

describe("consistency", () => {
  it("counts consecutive days with completed planned work", () => {
    const days = [
      { date: "2026-11-10", plannedSessions: 2, completedOrPartial: 1 },
      { date: "2026-11-11", plannedSessions: 0, completedOrPartial: 0 },
      { date: "2026-11-12", plannedSessions: 1, completedOrPartial: 1 },
      { date: "2026-11-13", plannedSessions: 1, completedOrPartial: 0 },
    ];
    expect(consistencyStreak(days, "2026-11-12")).toBe(2);
    expect(consistencyStreak(days, "2026-11-13")).toBe(0);
  });

  it("returns the average of recorded efficiency ratings", () => {
    expect(averageEfficiency([4, 6, 8])).toBe(6);
    expect(averageEfficiency([])).toBeNull();
  });
});
