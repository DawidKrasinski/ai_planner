import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export function addIsoDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const utc = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

export function eachIsoDate(start: string, end: string): string[] {
  const dates: string[] = [];
  let cursor = start;
  while (cursor <= end) {
    dates.push(cursor);
    cursor = addIsoDays(cursor, 1);
    if (dates.length > 370) {
      break;
    }
  }
  return dates;
}

export function isoWeekday(isoDate: string): number {
  const [year, month, day] = isoDate.split("-").map(Number);
  const utc = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
  const weekday = utc.getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

export function zonedTimestamp(isoDate: string, time: string, timeZone: string): number {
  return fromZonedTime(`${isoDate}T${time}:00`, timeZone).getTime();
}

export function dayBounds(
  isoDate: string,
  wakeTime: string,
  sleepTime: string,
  timeZone: string,
): { start: number; end: number } {
  const start = zonedTimestamp(isoDate, wakeTime, timeZone);
  let end = zonedTimestamp(isoDate, sleepTime, timeZone);
  if (end <= start) {
    end = zonedTimestamp(addIsoDays(isoDate, 1), sleepTime, timeZone);
  }
  return { start, end };
}

export function minutesBetween(start: number, end: number): number {
  return Math.round((end - start) / 60_000);
}

export function localIsoDate(instant: Date, timeZone: string): string {
  return formatInTimeZone(instant, timeZone, "yyyy-MM-dd");
}

export function weekContaining(isoDate: string): { start: string; end: string } {
  const start = addIsoDays(isoDate, 1 - isoWeekday(isoDate));
  return { start, end: addIsoDays(start, 6) };
}

export function periodRange(period: string, today: string): { start: string; end: string } | null {
  if (period === "all") {
    return null;
  }
  if (period === "today") {
    return { start: today, end: today };
  }
  if (period === "yesterday") {
    const day = addIsoDays(today, -1);
    return { start: day, end: day };
  }
  const spans: Record<string, number> = {
    "7d": 6,
    "30d": 29,
    "3m": 89,
    "1y": 364,
  };
  const span = spans[period];
  if (span === undefined) {
    return { start: today, end: today };
  }
  return { start: addIsoDays(today, -span), end: today };
}
