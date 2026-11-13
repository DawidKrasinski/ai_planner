import { clipInterval, overlaps, subtractAll, type Interval } from "./intervals";
import {
  ENGINE_VERSION,
  type BorrowRecord,
  type GoalCategory,
  type GoalScheduleInput,
  type PlanningInput,
  type ScheduleResult,
  type ScheduledBlock,
} from "./types";
import { dayBounds, eachIsoDate, isoWeekday, minutesBetween, zonedTimestamp } from "../time";

type Charge = {
  minutes: number;
  category: GoalCategory | "sleep";
  reason: string;
};

export function schedule(input: PlanningInput): ScheduleResult {
  const dates = eachIsoDate(input.periodStart, input.periodEnd);
  const blocks: ScheduledBlock[] = [];
  const warnings: string[] = [];
  const unplacedRoutines: string[] = [];
  const borrowed: BorrowRecord[] = [];
  const remaining: Record<GoalCategory, number> = { ...input.categoryBudgets };
  const borrowedByGoal = new Map<string, number>();
  let sleepBorrowedMinutes = 0;

  for (const hard of input.hardBlocks) {
    blocks.push({
      id: hard.id,
      kind: hard.kind ?? "fixed_commitment",
      title: hard.title,
      start: hard.start,
      end: hard.end,
      goalId: hard.goalId,
      sourceId: hard.id,
      reason: hard.preserved ? "Zachowany zapis wykonania." : "Stałe zobowiązanie.",
      fixed: true,
      locked: hard.locked ?? false,
      preserved: hard.preserved ?? false,
    });
    reserveBuffer(blocks, warnings, hard.id, hard.title, hard.start, hard.travelMinutes ?? 0, "travel");
    reserveBuffer(
      blocks,
      warnings,
      hard.id,
      hard.title,
      hard.start - (hard.travelMinutes ?? 0) * 60_000,
      hard.preparationMinutes ?? 0,
      "preparation",
    );
  }

  for (const date of dates) {
    const bounds = dayBounds(date, input.wakeTime, input.sleepTime, input.timezone);
    for (const meal of input.meals) {
      const start = zonedTimestamp(date, meal.time, input.timezone);
      const end = start + meal.durationMinutes * 60_000;
      if (start < bounds.start || end > bounds.end) {
        warnings.push(`Posiłek ${meal.title} wypada poza oknem dnia ${date}.`);
        continue;
      }
      if (blocks.some((block) => overlaps(block, { start, end }))) {
        warnings.push(`Posiłek ${meal.title} koliduje z istniejącym blokiem dnia ${date}.`);
        continue;
      }
      blocks.push(block({
        id: `meal:${meal.id}:${date}`,
        kind: "meal",
        title: meal.title,
        start,
        end,
        sourceId: meal.id,
        reason: "Posiłek w skonfigurowanej godzinie.",
      }));
    }
  }

  for (const routine of input.routines) {
    for (const date of dates) {
      if (routine.daysOfWeek.length > 0 && !routine.daysOfWeek.includes(isoWeekday(date))) {
        continue;
      }
      const window = {
        start: zonedTimestamp(date, routine.windowStart, input.timezone),
        end: zonedTimestamp(date, routine.windowEnd, input.timezone),
      };
      const slot = earliestFit(blocks, window, routine.durationMinutes, 0);
      if (!slot) {
        unplacedRoutines.push(routine.id);
        warnings.push(`Nie udało się umieścić rutyny ${routine.title} w dniu ${date}.`);
        continue;
      }
      reserveBuffer(blocks, warnings, routine.id, routine.title, slot.start, routine.travelMinutes ?? 0, "travel");
      blocks.push(block({
        id: `routine:${routine.id}:${date}`,
        kind: "routine_occurrence",
        title: routine.title,
        start: slot.start,
        end: slot.start + routine.durationMinutes * 60_000,
        sourceId: routine.id,
        reason: "Rutyna w skonfigurowanym oknie.",
      }));
    }
  }

  const flexible = [...input.flexibleTasks].sort(
    (left, right) => right.priority - left.priority || left.id.localeCompare(right.id),
  );
  for (const task of flexible) {
    const slot = earliestFit(
      blocks,
      { start: task.windowStart, end: task.windowEnd },
      task.durationMinutes,
      0,
    );
    if (!slot) {
      warnings.push(`Zadanie ${task.title} nie mieści się w oknie czasu.`);
      continue;
    }
    blocks.push(block({
      id: `flex:${task.id}`,
      kind: "flexible_task",
      title: task.title,
      start: slot.start,
      end: slot.start + task.durationMinutes * 60_000,
      sourceId: task.id,
      reason: "Zadanie elastyczne w wyznaczonym oknie.",
    }));
  }

  const goals = [...input.goals].sort(compareGoals);
  const unscheduledMinutes: ScheduleResult["unscheduledMinutes"] = [];
  const morningUsed = new Map<string, number>();
  const pending = new Map<string, number>(goals.map((goal) => [goal.id, goal.requestedMinutes]));

  for (const goal of goals.filter((item) => item.category === "training")) {
    const left = placeAcrossDays(
      input,
      dates,
      blocks,
      goal,
      pending.get(goal.id) ?? 0,
      "morning",
      remaining,
      borrowed,
      borrowedByGoal,
      morningUsed,
    );
    pending.set(goal.id, left);
  }
  for (const goal of goals.filter((item) => item.category === "learning_work")) {
    const left = placeAcrossDays(
      input,
      dates,
      blocks,
      goal,
      pending.get(goal.id) ?? 0,
      "core",
      remaining,
      borrowed,
      borrowedByGoal,
      morningUsed,
    );
    pending.set(goal.id, left);
  }
  for (const goal of goals.filter((item) => item.category === "training")) {
    const left = placeAcrossDays(
      input,
      dates,
      blocks,
      goal,
      pending.get(goal.id) ?? 0,
      "afternoon",
      remaining,
      borrowed,
      borrowedByGoal,
      morningUsed,
    );
    pending.set(goal.id, left);
  }
  for (const goal of goals.filter((item) => item.category === "leisure")) {
    const left = placeAcrossDays(
      input,
      dates,
      blocks,
      goal,
      pending.get(goal.id) ?? 0,
      "evening",
      remaining,
      borrowed,
      borrowedByGoal,
      morningUsed,
    );
    pending.set(goal.id, left);
  }
  for (const goal of goals) {
    let left = placeAcrossDays(
      input,
      dates,
      blocks,
      goal,
      pending.get(goal.id) ?? 0,
      "any",
      remaining,
      borrowed,
      borrowedByGoal,
      morningUsed,
    );
    if (left >= goal.minSessionMinutes && goal.manualPriority === 6 && goal.allowSleepBorrow) {
      left = placeSleep(
        input,
        dates,
        blocks,
        goal,
        left,
        remainingSleep(input, sleepBorrowedMinutes),
        borrowed,
        (minutes) => {
          sleepBorrowedMinutes += minutes;
        },
      );
    }
    if (left > 0) {
      unscheduledMinutes.push({
        goalId: goal.id,
        minutes: left,
        reason:
          left < goal.minSessionMinutes
            ? "Pozostały czas jest krótszy niż minimalna użyteczna sesja."
            : "Brak wolnego okna albo budżetu kategorii.",
      });
    }
  }

  blocks.sort((left, right) => left.start - right.start || left.id.localeCompare(right.id));

  const categoryTotals: Record<GoalCategory, number> = {
    training: budgetUsed(input.categoryBudgets.training, remaining.training),
    learning_work: budgetUsed(input.categoryBudgets.learning_work, remaining.learning_work),
    leisure: budgetUsed(input.categoryBudgets.leisure, remaining.leisure),
  };
  const goalTotals: Record<string, number> = {};
  for (const item of blocks) {
    if (item.kind !== "goal_session" || !item.goalId || item.preserved) {
      continue;
    }
    goalTotals[item.goalId] = (goalTotals[item.goalId] ?? 0) + minutesBetween(item.start, item.end);
  }

  const violations = validateSchedule(blocks, input, borrowed, sleepBorrowedMinutes);
  return {
    blocks,
    unscheduledMinutes,
    unplacedRoutines,
    violations,
    warnings,
    categoryTotals,
    goalTotals,
    borrowed,
    sleepBorrowedMinutes,
    validation: { ok: violations.length === 0 },
    engineVersion: ENGINE_VERSION,
    changes: diffBlocks(input.previousBlocks ?? [], blocks),
  };
}

export function validateSchedule(
  blocks: ScheduledBlock[],
  input: PlanningInput,
  borrowed: BorrowRecord[],
  sleepBorrowedMinutes: number,
): string[] {
  const violations: string[] = [];
  const sorted = [...blocks].sort((left, right) => left.start - right.start);
  for (let index = 0; index < sorted.length; index += 1) {
    const current = sorted[index];
    if (!current || current.end <= current.start) {
      violations.push("Blok ma nieprawidłowy zakres czasu.");
      continue;
    }
    for (let nextIndex = index + 1; nextIndex < sorted.length; nextIndex += 1) {
      const next = sorted[nextIndex];
      if (!next || next.start >= current.end) {
        break;
      }
      violations.push(`Nakładanie: ${current.id} i ${next.id}.`);
    }
  }
  for (const hard of input.hardBlocks) {
    const found = blocks.find((item) => item.id === hard.id);
    if (!found || found.start !== hard.start || found.end !== hard.end) {
      violations.push(`Zmieniono stały blok ${hard.id}.`);
    }
  }
  for (const record of borrowed) {
    const goal = input.goals.find((item) => item.id === record.goalId);
    if (!goal || goal.manualPriority < 5) {
      violations.push(`Niedozwolone pożyczanie dla celu ${record.goalId}.`);
      continue;
    }
    if (record.from === "training" && !goal.allowTrainingBorrow) {
      violations.push(`Pożyczanie czasu treningu bez zgody dla ${record.goalId}.`);
    }
    if (record.from === "sleep" && (goal.manualPriority !== 6 || !goal.allowSleepBorrow)) {
      violations.push(`Niedozwolone skrócenie snu dla ${record.goalId}.`);
    }
  }
  if (sleepBorrowedMinutes > input.sleepBorrowMaxMinutes) {
    violations.push("Przekroczono limit skracania snu.");
  }
  const dates = eachIsoDate(input.periodStart, input.periodEnd);
  for (const item of blocks) {
    if (item.kind !== "goal_session" || item.preserved || item.chargedCategory === "sleep") {
      continue;
    }
    const inside = dates.some((date) => {
      const bounds = dayBounds(date, input.wakeTime, input.sleepTime, input.timezone);
      return item.start >= bounds.start && item.end <= bounds.end;
    });
    if (!inside) {
      violations.push(`Sesja ${item.id} wychodzi poza chroniony sen.`);
    }
  }
  for (const item of blocks) {
    if (item.kind !== "routine_occurrence" || !item.sourceId) {
      continue;
    }
    const routine = input.routines.find((entry) => entry.id === item.sourceId);
    if (!routine) {
      continue;
    }
    const date = dates.find((candidate) => {
      const windowStart = zonedTimestamp(candidate, routine.windowStart, input.timezone);
      const windowEnd = zonedTimestamp(candidate, routine.windowEnd, input.timezone);
      return item.start >= windowStart && item.end <= windowEnd;
    });
    if (!date) {
      violations.push(`Rutyna ${item.id} jest poza oknem.`);
    }
  }
  return violations;
}

function placeAcrossDays(
  input: PlanningInput,
  dates: string[],
  blocks: ScheduledBlock[],
  goal: GoalScheduleInput,
  requested: number,
  mode: "morning" | "core" | "afternoon" | "evening" | "any",
  remaining: Record<GoalCategory, number>,
  borrowed: BorrowRecord[],
  borrowedByGoal: Map<string, number>,
  morningUsed: Map<string, number>,
): number {
  let left = requested;
  for (const date of dates) {
    if (left < goal.minSessionMinutes) {
      break;
    }
    const placed = placeOnDay(input, date, blocks, goal, left, mode, remaining, borrowed, borrowedByGoal, morningUsed, true);
    left -= placed;
  }
  for (const date of dates) {
    if (left < goal.minSessionMinutes) {
      break;
    }
    const placed = placeOnDay(input, date, blocks, goal, left, mode, remaining, borrowed, borrowedByGoal, morningUsed, false);
    left -= placed;
  }
  return left;
}

function placeOnDay(
  input: PlanningInput,
  date: string,
  blocks: ScheduledBlock[],
  goal: GoalScheduleInput,
  left: number,
  mode: "morning" | "core" | "afternoon" | "evening" | "any",
  remaining: Record<GoalCategory, number>,
  borrowed: BorrowRecord[],
  borrowedByGoal: Map<string, number>,
  morningUsed: Map<string, number>,
  oneChunk: boolean,
): number {
  let placed = 0;
  const bounds = dayBounds(date, input.wakeTime, input.sleepTime, input.timezone);
  const range = modeRange(bounds, mode);
  while (left - placed >= goal.minSessionMinutes) {
    const charge = nextCharge(goal, left - placed, input, remaining, borrowedByGoal, false);
    if (!charge) {
      break;
    }
    if (mode === "morning") {
      const used = morningUsed.get(date) ?? 0;
      const room = 60 - used;
      if (room < goal.minSessionMinutes) {
        break;
      }
      charge.minutes = Math.min(charge.minutes, room);
      if (charge.minutes < goal.minSessionMinutes) {
        break;
      }
    }
    const slot = earliestFit(blocks, range, charge.minutes, input.transitionMinutes, true);
    if (!slot) {
      break;
    }
    const start = slot.start;
    const end = start + charge.minutes * 60_000;
    if (blocks.some((item) => overlaps(item, { start, end }))) {
      break;
    }
    blocks.push(block({
      id: `goal:${goal.id}:${blocks.length}`,
      kind: "goal_session",
      title: goal.title,
      start,
      end,
      goalId: goal.id,
      chargedCategory: charge.category === "sleep" ? "sleep" : charge.category,
      reason: charge.reason,
    }));
    if (charge.minutes >= input.breakAfterMinutes) {
      const breakStart = end;
      const breakEnd = breakStart + input.breakMinutes * 60_000;
      const bounds = dayBounds(date, input.wakeTime, input.sleepTime, input.timezone);
      if (breakEnd <= bounds.end && !blocks.some((item) => overlaps(item, { start: breakStart, end: breakEnd }))) {
        blocks.push(block({
          id: `break:${goal.id}:${blocks.length}`,
          kind: "break",
          title: "Przerwa",
          start: breakStart,
          end: breakEnd,
          reason: "Przerwa po dłuższym bloku pracy.",
        }));
      }
    }
    commitCharge(goal, charge, remaining, borrowed, borrowedByGoal);
    if (mode === "morning") {
      morningUsed.set(date, (morningUsed.get(date) ?? 0) + charge.minutes);
    }
    placed += charge.minutes;
    if (oneChunk) {
      break;
    }
  }
  return placed;
}

function placeSleep(
  input: PlanningInput,
  dates: string[],
  blocks: ScheduledBlock[],
  goal: GoalScheduleInput,
  left: number,
  sleepRoom: number,
  borrowed: BorrowRecord[],
  onBorrow: (minutes: number) => void,
): number {
  let remainingSleep = sleepRoom;
  for (const date of dates) {
    if (left < goal.minSessionMinutes || remainingSleep < goal.minSessionMinutes) {
      break;
    }
    const bounds = dayBounds(date, input.wakeTime, input.sleepTime, input.timezone);
    const minutes = Math.min(left, remainingSleep, goal.maxSessionMinutes, goal.preferredSessionMinutes);
    if (minutes < goal.minSessionMinutes) {
      break;
    }
    const start = bounds.end;
    const end = start + minutes * 60_000;
    if (blocks.some((item) => overlaps(item, { start, end }))) {
      continue;
    }
    const charge: Charge = {
      minutes,
      category: "sleep",
      reason: "Wyjątkowe użycie chronionego snu dla priorytetu 6.",
    };
    blocks.push(block({
      id: `goal:${goal.id}:sleep:${date}`,
      kind: "goal_session",
      title: goal.title,
      start,
      end,
      goalId: goal.id,
      chargedCategory: "sleep",
      reason: charge.reason,
    }));
    borrowed.push({ goalId: goal.id, from: "sleep", minutes, reason: charge.reason });
    onBorrow(minutes);
    left -= minutes;
    remainingSleep -= minutes;
  }
  return left;
}

function nextCharge(
  goal: GoalScheduleInput,
  left: number,
  input: PlanningInput,
  remaining: Record<GoalCategory, number>,
  borrowedByGoal: Map<string, number>,
  allowSleep: boolean,
): Charge | null {
  const want = Math.min(left, goal.maxSessionMinutes, goal.preferredSessionMinutes);
  const sources = chargeSources(goal, input, allowSleep);
  for (const source of sources) {
    const available = source === "sleep" ? input.sleepBorrowMaxMinutes : remaining[source];
    const borrowCap = input.priorityBorrowCaps[priorityKey(goal.manualPriority)];
    const already = borrowedByGoal.get(goal.id) ?? 0;
    const capRoom =
      source === goal.category
        ? available
        : borrowCap === null
          ? available
          : Math.max(0, borrowCap - already);
    const take = Math.min(want, available, capRoom);
    if (take < goal.minSessionMinutes || take < input.minUsefulSessionMinutes) {
      continue;
    }
    return {
      minutes: take,
      category: source,
      reason:
        source === goal.category
          ? "Sesja w budżecie kategorii."
          : `Pożyczony czas z kategorii ${source} dla priorytetu ${goal.manualPriority}.`,
    };
  }
  return null;
}

function chargeSources(goal: GoalScheduleInput, input: PlanningInput, allowSleep: boolean): (GoalCategory | "sleep")[] {
  const sources: (GoalCategory | "sleep")[] = [goal.category];
  if (goal.manualPriority >= 5) {
    if (goal.category !== "leisure") {
      sources.push("leisure");
    }
    if (goal.category !== "training" && goal.allowTrainingBorrow) {
      sources.push("training");
    }
  }
  if (allowSleep && goal.manualPriority === 6 && goal.allowSleepBorrow) {
    sources.push("sleep");
  }
  void input;
  return sources;
}

function commitCharge(
  goal: GoalScheduleInput,
  charge: Charge,
  remaining: Record<GoalCategory, number>,
  borrowed: BorrowRecord[],
  borrowedByGoal: Map<string, number>,
): void {
  if (charge.category === "sleep") {
    return;
  }
  remaining[charge.category] -= charge.minutes;
  if (charge.category !== goal.category) {
    const reason = `Priorytet ${goal.manualPriority} korzysta z czasu kategorii ${charge.category}.`;
    borrowed.push({ goalId: goal.id, from: charge.category, minutes: charge.minutes, reason });
    borrowedByGoal.set(goal.id, (borrowedByGoal.get(goal.id) ?? 0) + charge.minutes);
  }
}

function earliestFit(
  blocks: ScheduledBlock[],
  range: Interval,
  durationMinutes: number,
  transitionMinutes: number,
  goalsOnly = false,
): Interval | null {
  const duration = durationMinutes * 60_000;
  const slots = subtractAll([range], blocks.map((item) => ({ start: item.start, end: item.end })));
  for (const slot of slots) {
    const previous = blocks.find((item) => item.end === slot.start && item.kind === "goal_session");
    const lead = goalsOnly && previous ? transitionMinutes * 60_000 : 0;
    if (slot.end - slot.start >= duration + lead) {
      return { start: slot.start + lead, end: slot.end };
    }
  }
  return null;
}

function modeRange(bounds: Interval, mode: "morning" | "core" | "afternoon" | "evening" | "any"): Interval {
  const threeHours = 3 * 60 * 60_000;
  const fourHours = 4 * 60 * 60_000;
  if (mode === "morning") {
    return { start: bounds.start, end: Math.min(bounds.end, bounds.start + threeHours) };
  }
  if (mode === "afternoon") {
    return {
      start: Math.min(bounds.end, bounds.start + threeHours),
      end: Math.max(bounds.start + threeHours, bounds.end - fourHours),
    };
  }
  if (mode === "evening") {
    return { start: Math.max(bounds.start, bounds.end - fourHours), end: bounds.end };
  }
  if (mode === "any") {
    return bounds;
  }
  return { start: bounds.start, end: Math.max(bounds.start, bounds.end - fourHours) };
}

function reserveBuffer(
  blocks: ScheduledBlock[],
  warnings: string[],
  sourceId: string,
  title: string,
  start: number,
  minutes: number,
  kind: "travel" | "preparation",
): void {
  if (minutes <= 0) {
    return;
  }
  const end = start;
  const bufferStart = start - minutes * 60_000;
  if (blocks.some((item) => overlaps(item, { start: bufferStart, end }))) {
    warnings.push(`Bufor ${kind} dla ${title} nachodzi na inny blok.`);
    return;
  }
  blocks.push(block({
    id: `${kind}:${sourceId}:${bufferStart}`,
    kind,
    title: kind === "travel" ? `Dojazd: ${title}` : `Przygotowanie: ${title}`,
    start: bufferStart,
    end,
    sourceId,
    reason: kind === "travel" ? "Czas dojazdu." : "Czas przygotowania.",
  }));
}

function block(partial: Omit<ScheduledBlock, "fixed" | "locked" | "preserved">): ScheduledBlock {
  return { ...partial, fixed: false, locked: false, preserved: false };
}

function compareGoals(left: GoalScheduleInput, right: GoalScheduleInput): number {
  return right.urgency - left.urgency || right.manualPriority - left.manualPriority || left.id.localeCompare(right.id);
}

function priorityKey(priority: number): "1" | "2" | "3" | "4" | "5" | "6" {
  if (priority <= 1) return "1";
  if (priority === 2) return "2";
  if (priority === 3) return "3";
  if (priority === 4) return "4";
  if (priority === 5) return "5";
  return "6";
}

function budgetUsed(total: number, left: number): number {
  return total - left;
}

function remainingSleep(input: PlanningInput, used: number): number {
  return Math.max(0, input.sleepBorrowMaxMinutes - used);
}

function diffBlocks(previous: ScheduledBlock[], next: ScheduledBlock[]): ScheduleResult["changes"] {
  const previousKeys = new Map(previous.map((item) => [identity(item), item]));
  const nextKeys = new Map(next.map((item) => [identity(item), item]));
  const added: string[] = [];
  const removed: string[] = [];
  const moved: string[] = [];
  for (const [key, item] of nextKeys) {
    const prior = [...previousKeys.values()].find((candidate) => sameActivity(candidate, item));
    if (!prior) {
      added.push(key);
    } else if (prior.start !== item.start || prior.end !== item.end) {
      moved.push(key);
    }
  }
  for (const [key, item] of previousKeys) {
    const still = [...nextKeys.values()].find((candidate) => sameActivity(candidate, item));
    if (!still) {
      removed.push(key);
    }
  }
  return { added, removed, moved };
}

function identity(blockItem: ScheduledBlock): string {
  return `${blockItem.kind}:${blockItem.goalId ?? blockItem.sourceId ?? blockItem.id}:${blockItem.start}`;
}

function sameActivity(left: ScheduledBlock, right: ScheduledBlock): boolean {
  if (left.kind !== right.kind) {
    return false;
  }
  if (left.goalId && right.goalId) {
    return left.goalId === right.goalId;
  }
  if (left.sourceId && right.sourceId) {
    return left.sourceId === right.sourceId;
  }
  return left.id === right.id;
}

export function hasOverlap(blocks: ScheduledBlock[]): boolean {
  const sorted = [...blocks].sort((left, right) => left.start - right.start);
  for (let index = 0; index < sorted.length - 1; index += 1) {
    const current = sorted[index];
    const next = sorted[index + 1];
    if (current && next && overlaps(current, next)) {
      return true;
    }
  }
  return false;
}

export function clipToRange(slot: Interval, range: Interval): Interval | null {
  return clipInterval(slot, range);
}
