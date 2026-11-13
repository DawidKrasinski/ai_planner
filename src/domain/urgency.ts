export type UrgencyConfig = {
  priorityWeight: number;
  deadlineWindowDays: number;
  deadlineBoost: number;
};

export const defaultUrgencyConfig: UrgencyConfig = {
  priorityWeight: 100,
  deadlineWindowDays: 30,
  deadlineBoost: 250,
};

export type UrgencyInput = {
  manualPriority: number;
  deadlineAt: Date | null;
  now: Date;
  config?: UrgencyConfig;
};

export type UrgencyResult = {
  manualPriority: number;
  urgency: number;
  deadlineBoost: number;
  daysRemaining: number | null;
  explanation: string;
};

export function computeUrgency(input: UrgencyInput): UrgencyResult {
  const config = input.config ?? defaultUrgencyConfig;
  const daysRemaining = input.deadlineAt
    ? (input.deadlineAt.getTime() - input.now.getTime()) / 86_400_000
    : null;
  let deadlineBoost = 0;
  if (daysRemaining !== null && config.deadlineWindowDays > 0) {
    const closeness = Math.min(1, Math.max(0, (config.deadlineWindowDays - daysRemaining) / config.deadlineWindowDays));
    deadlineBoost = closeness * config.deadlineBoost;
  }
  const urgency = input.manualPriority * config.priorityWeight + deadlineBoost;
  const explanation =
    daysRemaining === null
      ? `Priorytet ręczny ${input.manualPriority} bez terminu.`
      : `Priorytet ręczny ${input.manualPriority} pozostaje bez zmian. Termin za ${daysRemaining.toFixed(1)} dni dodaje ${deadlineBoost.toFixed(1)} do pilności.`;
  return {
    manualPriority: input.manualPriority,
    urgency,
    deadlineBoost,
    daysRemaining,
    explanation,
  };
}
