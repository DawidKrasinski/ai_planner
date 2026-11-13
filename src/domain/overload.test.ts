import { describe, expect, it } from "vitest";
import { assessOverload } from "./overload";

describe("overload policy", () => {
  it("reduces only low priorities when completion stays low", () => {
    const result = assessOverload({
      recentCompletion: [40, 50, 55],
      scheduledMinutes: 1800,
      goals: [
        { id: "low", manualPriority: 2, plannedMinutes: 100 },
        { id: "high", manualPriority: 4, plannedMinutes: 200 },
      ],
      sleepPressure: false,
    });
    expect(result.action).toBe("reduce");
    expect(result.reductions).toEqual([
      { goalId: "low", fromMinutes: 100, toMinutes: 70 },
    ]);
  });

  it("asks before changing higher priorities when nothing low can be reduced", () => {
    const result = assessOverload({
      recentCompletion: [90, 90, 40],
      scheduledMinutes: 3000,
      goals: [{ id: "work", manualPriority: 4, plannedMinutes: 400 }],
      sleepPressure: false,
    });
    expect(result.action).toBe("ask");
    expect(result.reductions).toEqual([]);
  });

  it("asks instead of reducing sleep-sensitive high-priority work", () => {
    const result = assessOverload({
      recentCompletion: [20, 20, 20],
      scheduledMinutes: 1000,
      goals: [{ id: "critical", manualPriority: 6, plannedMinutes: 300 }],
      sleepPressure: true,
    });
    expect(result.severity).toBe("high");
    expect(result.action).toBe("ask");
  });

  it("leaves a healthy week unchanged", () => {
    const result = assessOverload({
      recentCompletion: [90, 80],
      scheduledMinutes: 1000,
      goals: [{ id: "goal", manualPriority: 3, plannedMinutes: 120 }],
      sleepPressure: false,
    });
    expect(result.action).toBe("none");
  });
});
