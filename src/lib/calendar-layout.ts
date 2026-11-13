/** Meridian week board uses ~54px per hour (see meridian.css .day-grid gradient). */
export const CAL_PX_PER_HOUR = 54;
export const CAL_DEFAULT_START_HOUR = 7;
export const CAL_DEFAULT_END_HOUR = 14;

export type CalendarLayoutInput = {
  startAt: Date;
  endAt: Date;
  dayStartHour?: number;
  pxPerHour?: number;
};

export type CalendarLayout = {
  top: number;
  height: number;
  dayIndex: number;
};

export function minutesFromHour(date: Date, dayStartHour: number): number {
  return date.getHours() * 60 + date.getMinutes() - dayStartHour * 60;
}

export function layoutCalendarBlock(input: CalendarLayoutInput): Omit<CalendarLayout, "dayIndex"> {
  const dayStartHour = input.dayStartHour ?? CAL_DEFAULT_START_HOUR;
  const pxPerHour = input.pxPerHour ?? CAL_PX_PER_HOUR;
  const startMinutes = minutesFromHour(input.startAt, dayStartHour);
  const endMinutes = minutesFromHour(input.endAt, dayStartHour);
  const duration = Math.max(endMinutes - startMinutes, 15);
  return {
    top: Math.max(0, (startMinutes / 60) * pxPerHour),
    height: Math.max(22, (duration / 60) * pxPerHour),
  };
}

export function timeLabels(startHour: number, endHour: number): string[] {
  const labels: string[] = [];
  for (let hour = startHour; hour <= endHour; hour += 1) {
    labels.push(`${String(hour).padStart(2, "0")}:00`);
  }
  return labels;
}

export function formatTimeRange(startAt: Date, endAt: Date): string {
  const fmt = (d: Date) =>
    `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${fmt(startAt)}–${fmt(endAt)}`;
}

export function categoryColor(
  category: string | null | undefined,
  itemType?: string,
): "violet" | "blue" | "green" | "neutral" {
  if (itemType === "fixed_commitment" || itemType === "one_off_event") {
    return "neutral";
  }
  if (category === "training") {
    return "blue";
  }
  if (category === "leisure") {
    return "green";
  }
  if (category === "learning_work") {
    return "violet";
  }
  return "violet";
}

export function categoryLabel(category: string): string {
  if (category === "training") {
    return "Trening";
  }
  if (category === "leisure") {
    return "Czas wolny";
  }
  return "Nauka i praca";
}

export function difficultyLabel(difficulty: number): string {
  if (difficulty <= 3) {
    return "Niska";
  }
  if (difficulty <= 6) {
    return "Średnia";
  }
  return "Wysoka";
}

export function formatMinutes(total: number): string {
  const hours = Math.floor(total / 60);
  const minutes = Math.round(total % 60);
  if (hours === 0) {
    return `${minutes}m`;
  }
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
}
