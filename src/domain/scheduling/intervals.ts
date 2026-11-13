export type Interval = { start: number; end: number };

export function overlaps(left: Interval, right: Interval): boolean {
  return left.start < right.end && right.start < left.end;
}

export function subtractInterval(source: Interval, block: Interval): Interval[] {
  if (block.end <= source.start || block.start >= source.end) {
    return [source];
  }
  const parts: Interval[] = [];
  if (block.start > source.start) {
    parts.push({ start: source.start, end: Math.min(block.start, source.end) });
  }
  if (block.end < source.end) {
    parts.push({ start: Math.max(block.end, source.start), end: source.end });
  }
  return parts.filter((part) => part.end > part.start);
}

export function subtractAll(sources: Interval[], blocks: Interval[]): Interval[] {
  let free = sources.filter((source) => source.end > source.start);
  for (const block of blocks) {
    free = free.flatMap((source) => subtractInterval(source, block));
  }
  return free;
}

export function clipInterval(source: Interval, range: Interval): Interval | null {
  const start = Math.max(source.start, range.start);
  const end = Math.min(source.end, range.end);
  if (end <= start) {
    return null;
  }
  return { start, end };
}
