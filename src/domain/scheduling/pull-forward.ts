import type { ScheduledBlock } from "./types";

export function pullForward(
  blocks: ScheduledBlock[],
  freed: { start: number; end: number },
  transitionMinutes: number,
): ScheduledBlock[] {
  const delta = freed.end - freed.start;
  if (delta <= 0) {
    return blocks.map((block) => ({ ...block }));
  }
  const sorted = [...blocks].sort((left, right) => left.start - right.start || left.id.localeCompare(right.id));
  const moved: ScheduledBlock[] = [];
  let cursor = freed.start;
  for (const block of sorted) {
    if (block.end <= freed.start || block.fixed || block.preserved || block.locked) {
      moved.push({ ...block });
      cursor = Math.max(cursor, block.end);
      continue;
    }
    const duration = block.end - block.start;
    const nextFixed = sorted.find((candidate) => candidate.fixed && candidate.start >= block.start);
    let start = Math.max(freed.start, Math.min(block.start, cursor));
    if (block.start >= freed.end) {
      start = Math.max(cursor, block.start - delta);
    }
    const lead = moved.at(-1)?.kind === "goal_session" && block.kind === "goal_session" ? transitionMinutes * 60_000 : 0;
    start = Math.max(start, cursor + lead);
    if (nextFixed && start + duration > nextFixed.start) {
      moved.push({ ...block });
      cursor = Math.max(cursor, block.end);
      continue;
    }
    const next = { ...block, start, end: start + duration };
    moved.push(next);
    cursor = next.end;
  }
  return moved.sort((left, right) => left.start - right.start || left.id.localeCompare(right.id));
}
