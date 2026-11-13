export type EfficiencyInput = {
  actualMinutes: number;
  efficiencyRating: number;
};

export type DifficultyInput = EfficiencyInput & {
  difficulty: number;
};

export function effectiveMinutes(actualMinutes: number, efficiencyRating: number): number {
  return actualMinutes * (efficiencyRating / 10);
}

export function planCompletionPercent(
  actualMinutes: number,
  efficiencyRating: number,
  plannedMinutes: number,
): number | null {
  if (plannedMinutes <= 0) {
    return null;
  }
  const efficiency = efficiencyRating / 10;
  return (actualMinutes * efficiency / plannedMinutes) * 100;
}

export function displayPlanCompletion(rawPercent: number | null, capAt100: boolean): number | null {
  if (rawPercent === null) {
    return null;
  }
  if (capAt100) {
    return Math.min(100, rawPercent);
  }
  return rawPercent;
}

export function dailyDifficulty(entries: DifficultyInput[]): number {
  return entries.reduce((sum, entry) => {
    const hours = entry.actualMinutes / 60;
    const efficiency = entry.efficiencyRating / 10;
    return sum + hours * efficiency * entry.difficulty;
  }, 0);
}

export function averageEfficiency(ratings: number[]): number | null {
  if (ratings.length === 0) {
    return null;
  }
  return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
}

export type DayActivity = {
  date: string;
  plannedSessions: number;
  completedOrPartial: number;
};

/**
 * A day continues a consistency streak when it had planned work and at least
 * one session was completed or partially completed. Days with no planned work
 * neither break nor extend the streak.
 */
export function consistencyStreak(days: DayActivity[], today: string): number {
  const ordered = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const byDate = new Map(ordered.map((day) => [day.date, day]));
  let cursor = today;
  const todayRecord = byDate.get(cursor);
  if (!todayRecord || todayRecord.plannedSessions === 0) {
    cursor = previousDate(cursor);
  }
  let streak = 0;
  while (true) {
    const record = byDate.get(cursor);
    if (!record) {
      break;
    }
    if (record.plannedSessions === 0) {
      cursor = previousDate(cursor);
      continue;
    }
    if (record.completedOrPartial <= 0) {
      break;
    }
    streak += 1;
    cursor = previousDate(cursor);
  }
  return streak;
}

function previousDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const utc = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
  utc.setUTCDate(utc.getUTCDate() - 1);
  return utc.toISOString().slice(0, 10);
}
