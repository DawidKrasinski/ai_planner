import { describe, expect, it } from "vitest";
import { schedule } from "./engine";
import { pullForward } from "./pull-forward";
import type { PlanningInput, ScheduledBlock } from "./types";
import { dayBounds, zonedTimestamp } from "../time";

const timezone = "Europe/Warsaw";

function baseInput(overrides: Partial<PlanningInput> = {}): PlanningInput {
  return {
    periodStart: "2026-11-16",
    periodEnd: "2026-11-16",
    timezone,
    wakeTime: "07:00",
    sleepTime: "23:00",
    transitionMinutes: 10,
    breakAfterMinutes: 90,
    breakMinutes: 15,
    minUsefulSessionMinutes: 30,
    categoryBudgets: { training: 600, learning_work: 600, leisure: 600 },
    priorityBorrowCaps: { "1": 0, "2": 30, "3": 60, "4": 120, "5": 240, "6": null },
    sleepBorrowMaxMinutes: 60,
    goals: [],
    hardBlocks: [],
    routines: [],
    flexibleTasks: [],
    meals: [],
    ...overrides,
  };
}

function goal(
  partial: Partial<PlanningInput["goals"][number]> & Pick<PlanningInput["goals"][number], "id" | "category">,
): PlanningInput["goals"][number] {
  return {
    title: partial.id,
    manualPriority: 3,
    urgency: partial.manualPriority ?? 3,
    requestedMinutes: 60,
    minSessionMinutes: 30,
    maxSessionMinutes: 180,
    preferredSessionMinutes: 60,
    allowTrainingBorrow: false,
    allowSleepBorrow: false,
    ...partial,
  };
}

describe("scheduling engine", () => {
  it("places requested work inside the waking day without overlaps", () => {
    const result = schedule(baseInput({
      goals: [goal({ id: "learn", category: "learning_work", requestedMinutes: 120, urgency: 300 })],
    }));
    expect(result.validation.ok).toBe(true);
    expect(result.goalTotals.learn).toBe(120);
    const bounds = dayBounds("2026-11-16", "07:00", "23:00", timezone);
    for (const block of result.blocks.filter((item) => item.kind === "goal_session")) {
      expect(block.start).toBeGreaterThanOrEqual(bounds.start);
      expect(block.end).toBeLessThanOrEqual(bounds.end);
    }
    expect(overlapsAny(result.blocks)).toBe(false);
  });

  it("does not move fixed commitments", () => {
    const start = zonedTimestamp("2026-11-16", "10:00", timezone);
    const end = zonedTimestamp("2026-11-16", "12:00", timezone);
    const result = schedule(baseInput({
      hardBlocks: [{ id: "work", title: "Praca", start, end }],
      goals: [goal({ id: "learn", category: "learning_work", requestedMinutes: 180, urgency: 400 })],
    }));
    const fixed = result.blocks.find((item) => item.id === "work");
    expect(fixed).toMatchObject({ start, end });
    expect(result.blocks.filter((item) => item.kind === "goal_session").some((item) => item.start < end && start < item.end)).toBe(false);
    expect(result.validation.ok).toBe(true);
  });

  it("keeps priorities 1 through 4 inside their own category", () => {
    const result = schedule(baseInput({
      categoryBudgets: { training: 0, learning_work: 0, leisure: 300 },
      goals: [goal({
        id: "learn",
        category: "learning_work",
        manualPriority: 4,
        urgency: 400,
        requestedMinutes: 60,
        allowTrainingBorrow: true,
      })],
    }));
    expect(result.goalTotals.learn ?? 0).toBe(0);
    expect(result.borrowed).toEqual([]);
    expect(result.unscheduledMinutes[0]?.minutes).toBe(60);
    expect(result.validation.ok).toBe(true);
  });

  it("lets priority 5 borrow leisure before training", () => {
    const withoutTraining = schedule(baseInput({
      categoryBudgets: { training: 180, learning_work: 0, leisure: 60 },
      goals: [goal({
        id: "exam",
        category: "learning_work",
        manualPriority: 5,
        urgency: 800,
        requestedMinutes: 120,
        allowTrainingBorrow: false,
      })],
    }));
    expect(withoutTraining.goalTotals.exam).toBe(60);
    expect(withoutTraining.borrowed.map((item) => item.from)).toEqual(["leisure"]);
    expect(withoutTraining.validation.ok).toBe(true);

    const withTraining = schedule(baseInput({
      categoryBudgets: { training: 180, learning_work: 0, leisure: 60 },
      goals: [goal({
        id: "exam",
        category: "learning_work",
        manualPriority: 5,
        urgency: 800,
        requestedMinutes: 120,
        allowTrainingBorrow: true,
      })],
    }));
    expect(withTraining.goalTotals.exam).toBe(120);
    expect(withTraining.borrowed.map((item) => item.from)).toEqual(["leisure", "training"]);
  });

  it("caps priority 5 borrowing at the configured allowance", () => {
    const result = schedule(baseInput({
      categoryBudgets: { training: 0, learning_work: 0, leisure: 500 },
      goals: [goal({
        id: "exam",
        category: "learning_work",
        manualPriority: 5,
        urgency: 900,
        requestedMinutes: 400,
        preferredSessionMinutes: 90,
        maxSessionMinutes: 90,
      })],
    }));
    expect(result.goalTotals.exam).toBe(240);
    expect(result.unscheduledMinutes.reduce((sum, item) => sum + item.minutes, 0)).toBe(160);
  });

  it("protects sleep for priorities below 6", () => {
    const result = schedule(baseInput({
      categoryBudgets: { training: 0, learning_work: 0, leisure: 0 },
      goals: [goal({
        id: "exam",
        category: "learning_work",
        manualPriority: 5,
        urgency: 900,
        requestedMinutes: 60,
        allowSleepBorrow: true,
      })],
    }));
    const bounds = dayBounds("2026-11-16", "07:00", "23:00", timezone);
    expect(result.blocks.filter((item) => item.kind === "goal_session").every((item) => item.end <= bounds.end)).toBe(true);
    expect(result.sleepBorrowedMinutes).toBe(0);
  });

  it("allows an authorized priority 6 goal to use a limited part of sleep", () => {
    const result = schedule(baseInput({
      categoryBudgets: { training: 0, learning_work: 0, leisure: 0 },
      sleepBorrowMaxMinutes: 30,
      goals: [goal({
        id: "critical",
        category: "learning_work",
        manualPriority: 6,
        urgency: 1000,
        requestedMinutes: 90,
        minSessionMinutes: 30,
        preferredSessionMinutes: 30,
        maxSessionMinutes: 30,
        allowSleepBorrow: true,
      })],
    }));
    expect(result.validation.ok).toBe(true);
    expect(result.sleepBorrowedMinutes).toBe(30);
    expect(result.goalTotals.critical).toBe(30);
    const bounds = dayBounds("2026-11-16", "07:00", "23:00", timezone);
    const session = result.blocks.find((item) => item.goalId === "critical");
    expect(session?.start).toBe(bounds.end);
    expect(session?.end).toBe(bounds.end + 30 * 60_000);
  });

  it("places routines inside their windows", () => {
    const result = schedule(baseInput({
      routines: [{
        id: "hygiene",
        title: "Higiena",
        durationMinutes: 20,
        windowStart: "07:00",
        windowEnd: "08:00",
        daysOfWeek: [1],
      }],
    }));
    const routine = result.blocks.find((item) => item.kind === "routine_occurrence");
    const windowStart = zonedTimestamp("2026-11-16", "07:00", timezone);
    const windowEnd = zonedTimestamp("2026-11-16", "08:00", timezone);
    expect(routine?.start).toBeGreaterThanOrEqual(windowStart);
    expect(routine?.end).toBeLessThanOrEqual(windowEnd);
    expect(result.validation.ok).toBe(true);
  });

  it("reserves travel and preparation before a fixed event", () => {
    const start = zonedTimestamp("2026-11-16", "12:00", timezone);
    const end = zonedTimestamp("2026-11-16", "13:00", timezone);
    const result = schedule(baseInput({
      hardBlocks: [{ id: "doctor", title: "Lekarz", start, end, travelMinutes: 30, preparationMinutes: 15, kind: "one_off_event" }],
      goals: [goal({ id: "learn", category: "learning_work", requestedMinutes: 240, urgency: 300 })],
    }));
    const bufferStart = start - 45 * 60_000;
    expect(result.blocks.some((item) => item.kind === "travel" && item.end === start)).toBe(true);
    expect(result.blocks.some((item) => item.kind === "preparation" && item.start === bufferStart)).toBe(true);
    expect(result.blocks.filter((item) => item.kind === "goal_session").some((item) => item.start < start && item.end > bufferStart)).toBe(false);
  });

  it("keeps the waking window stable across the spring daylight-saving change", () => {
    const bounds = dayBounds("2026-03-29", "07:00", "23:00", timezone);
    expect(bounds.end - bounds.start).toBe(16 * 60 * 60_000);
    const shortNight = dayBounds("2026-03-29", "01:00", "06:00", timezone);
    expect(shortNight.end - shortNight.start).toBe(4 * 60 * 60_000);
    const result = schedule(baseInput({
      periodStart: "2026-03-29",
      periodEnd: "2026-03-29",
      goals: [goal({ id: "learn", category: "learning_work", requestedMinutes: 60 })],
    }));
    expect(result.validation.ok).toBe(true);
    expect(result.goalTotals.learn).toBe(60);
  });

  it("reports capacity that does not fit instead of overlapping work", () => {
    const result = schedule(baseInput({
      goals: [goal({
        id: "learn",
        category: "learning_work",
        requestedMinutes: 2000,
        preferredSessionMinutes: 180,
        maxSessionMinutes: 180,
      })],
    }));
    expect(result.validation.ok).toBe(true);
    expect(result.unscheduledMinutes[0]?.minutes).toBeGreaterThan(0);
    expect(overlapsAny(result.blocks)).toBe(false);
    expect((result.goalTotals.learn ?? 0) + (result.unscheduledMinutes[0]?.minutes ?? 0)).toBe(2000);
  });

  it("preserves locked and completed blocks", () => {
    const start = zonedTimestamp("2026-11-16", "09:00", timezone);
    const end = zonedTimestamp("2026-11-16", "10:00", timezone);
    const result = schedule(baseInput({
      hardBlocks: [{
        id: "done",
        title: "Gotowe",
        start,
        end,
        kind: "goal_session",
        locked: true,
        preserved: true,
        goalId: "learn",
      }],
      goals: [goal({ id: "learn", category: "learning_work", requestedMinutes: 60 })],
    }));
    expect(result.blocks.find((item) => item.id === "done")).toMatchObject({ start, end, locked: true, preserved: true });
    expect(result.validation.ok).toBe(true);
  });

  it("is deterministic for the same input", () => {
    const input = baseInput({
      goals: [
        goal({ id: "b", category: "leisure", requestedMinutes: 90, urgency: 200, manualPriority: 2 }),
        goal({ id: "a", category: "training", requestedMinutes: 60, urgency: 500, manualPriority: 4 }),
        goal({ id: "c", category: "learning_work", requestedMinutes: 120, urgency: 500, manualPriority: 3 }),
      ],
    });
    expect(schedule(input)).toEqual(schedule(input));
  });

  it("does not place a fragment below the minimum useful length", () => {
    const early = zonedTimestamp("2026-11-16", "07:20", timezone);
    const late = zonedTimestamp("2026-11-16", "22:00", timezone);
    const result = schedule(baseInput({
      hardBlocks: [{ id: "block", title: "Blok", start: early, end: late }],
      goals: [goal({
        id: "learn",
        category: "learning_work",
        requestedMinutes: 90,
        minSessionMinutes: 45,
        preferredSessionMinutes: 45,
        maxSessionMinutes: 45,
      })],
    }));
    const sessions = result.blocks.filter((item) => item.goalId === "learn" && !item.preserved);
    expect(sessions.every((item) => item.end - item.start >= 45 * 60_000)).toBe(true);
    expect(sessions.some((item) => item.start < early)).toBe(false);
  });

  it("leaves a transition between goal sessions", () => {
    const result = schedule(baseInput({
      goals: [
        goal({ id: "learn", category: "learning_work", requestedMinutes: 60, urgency: 400, manualPriority: 4 }),
        goal({ id: "rest", category: "leisure", requestedMinutes: 60, urgency: 100, manualPriority: 2 }),
      ],
    }));
    const sessions = result.blocks
      .filter((item) => item.kind === "goal_session")
      .sort((left, right) => left.start - right.start);
    for (let index = 1; index < sessions.length; index += 1) {
      const previous = sessions[index - 1];
      const current = sessions[index];
      if (previous && current && previous.goalId !== current.goalId) {
        expect(current.start - previous.end).toBeGreaterThanOrEqual(10 * 60_000);
      }
    }
  });

  it("places leisure after the main learning block when both fit", () => {
    const result = schedule(baseInput({
      goals: [
        goal({ id: "learn", category: "learning_work", requestedMinutes: 60, urgency: 300, manualPriority: 3 }),
        goal({ id: "rest", category: "leisure", requestedMinutes: 60, urgency: 100, manualPriority: 2 }),
      ],
    }));
    const learn = result.blocks.find((item) => item.goalId === "learn");
    const rest = result.blocks.find((item) => item.goalId === "rest");
    expect(learn && rest && learn.end <= rest.start).toBe(true);
  });
});

describe("early completion", () => {
  it("moves a later flexible block forward without crossing a fixed commitment", () => {
    const fixedStart = zonedTimestamp("2026-11-16", "13:00", timezone);
    const blocks: ScheduledBlock[] = [
      {
        id: "done",
        kind: "goal_session",
        title: "Nauka",
        start: zonedTimestamp("2026-11-16", "10:00", timezone),
        end: zonedTimestamp("2026-11-16", "10:30", timezone),
        goalId: "learn",
        fixed: true,
        locked: true,
        preserved: true,
        reason: "Zakończone wcześniej.",
      },
      {
        id: "next",
        kind: "goal_session",
        title: "Lektura",
        start: zonedTimestamp("2026-11-16", "11:00", timezone),
        end: zonedTimestamp("2026-11-16", "12:00", timezone),
        goalId: "read",
        fixed: false,
        locked: false,
        preserved: false,
        reason: "Sesja.",
      },
      {
        id: "fixed",
        kind: "fixed_commitment",
        title: "Spotkanie",
        start: fixedStart,
        end: zonedTimestamp("2026-11-16", "14:00", timezone),
        fixed: true,
        locked: false,
        preserved: false,
        reason: "Stałe.",
      },
    ];
    const moved = pullForward(blocks, {
      start: zonedTimestamp("2026-11-16", "10:30", timezone),
      end: zonedTimestamp("2026-11-16", "11:00", timezone),
    }, 0);
    const next = moved.find((item) => item.id === "next");
    const fixed = moved.find((item) => item.id === "fixed");
    expect(next?.start).toBe(zonedTimestamp("2026-11-16", "10:30", timezone));
    expect(fixed?.start).toBe(fixedStart);
    expect(overlapsAny(moved)).toBe(false);
  });
});

function overlapsAny(blocks: { start: number; end: number }[]): boolean {
  const sorted = [...blocks].sort((left, right) => left.start - right.start);
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    if (previous && current && previous.end > current.start) {
      return true;
    }
  }
  return false;
}
