import type { SettingsInput } from "./schemas";

export const defaultSettings: SettingsInput = {
  wakeTime: "07:00",
  sleepTime: "23:00",
  transitionMinutes: 10,
  breakAfterMinutes: 90,
  breakMinutes: 15,
  minUsefulSessionMinutes: 30,
  sleepBorrowMaxMinutes: 60,
  capPlanCompletion: false,
  categoryBudgets: {
    training: 360,
    learning_work: 1200,
    leisure: 420,
  },
  priorityBorrowCaps: {
    "1": 0,
    "2": 30,
    "3": 60,
    "4": 120,
    "5": 240,
    "6": null,
  },
  meals: [
    { id: "breakfast", title: "Śniadanie", time: "08:00", durationMinutes: 30 },
    { id: "lunch", title: "Obiad", time: "13:30", durationMinutes: 40 },
    { id: "dinner", title: "Kolacja", time: "19:00", durationMinutes: 30 },
  ],
  urgency: {
    priorityWeight: 100,
    deadlineWindowDays: 30,
    deadlineBoost: 250,
  },
  overload: {
    lowCompletionThreshold: 60,
    consecutiveLowDays: 3,
    highLoadMinutes: 2400,
    autoReducePriorities: [1, 2],
    askBeforePriorities: [3, 4],
  },
  googleExportEnabled: false,
};
