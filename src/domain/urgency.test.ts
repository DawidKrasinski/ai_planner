import { describe, expect, it } from "vitest";
import { computeUrgency } from "./urgency";

const now = new Date("2026-11-13T12:00:00.000Z");

describe("deadline urgency", () => {
  it("keeps manual priority separate from urgency", () => {
    const result = computeUrgency({
      manualPriority: 2,
      deadlineAt: new Date("2026-11-14T12:00:00.000Z"),
      now,
    });
    expect(result.manualPriority).toBe(2);
    expect(result.urgency).toBeGreaterThan(200);
    expect(result.deadlineBoost).toBeGreaterThan(90);
  });

  it("lets an imminent low priority outrank a distant high priority", () => {
    const imminent = computeUrgency({
      manualPriority: 2,
      deadlineAt: new Date("2026-11-14T12:00:00.000Z"),
      now,
    });
    const distant = computeUrgency({
      manualPriority: 4,
      deadlineAt: new Date("2027-06-01T12:00:00.000Z"),
      now,
    });
    expect(imminent.urgency).toBeGreaterThan(distant.urgency);
    expect(distant.manualPriority).toBe(4);
  });

  it("adds no deadline boost when a goal has no deadline", () => {
    const result = computeUrgency({ manualPriority: 3, deadlineAt: null, now });
    expect(result.urgency).toBe(300);
    expect(result.deadlineBoost).toBe(0);
  });
});
