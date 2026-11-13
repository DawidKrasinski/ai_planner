import { z } from "zod";
import { api } from "@/lib/api";
import { requireDb } from "@/db/client";
import {
  aiConversations,
  aiMemoryEntries,
  aiMessages,
  backgroundJobs,
  calendarItems,
  fixedCommitmentDefinitions,
  goalProgressEntries,
  goalSessions,
  goals,
  integrationConnections,
  planChanges,
  routineDefinitions,
  userProfiles,
  userSettings,
  weeklyGoalBudgets,
  weeklyPlans,
} from "@/db/schema";

export async function GET() {
  return api(async () => {
    const db = requireDb();
    const [profile, settings, goalRows, sessions, progress, plans, items, changes] = await Promise.all([
      db.select().from(userProfiles),
      db.select().from(userSettings),
      db.select().from(goals),
      db.select().from(goalSessions),
      db.select().from(goalProgressEntries),
      db.select().from(weeklyPlans),
      db.select().from(calendarItems),
      db.select().from(planChanges),
    ]);
    return { profile, settings, goals: goalRows, sessions, progress, plans, items, changes };
  });
}

const DeleteSchema = z.strictObject({ confirmation: z.literal("USUŃ MOJE DANE") });

export async function DELETE(request: Request) {
  return api(async () => {
    DeleteSchema.parse(await request.json());
    const db = requireDb();
    await db.delete(aiMessages);
    await db.delete(aiConversations);
    await db.delete(aiMemoryEntries);
    await db.delete(goalSessions);
    await db.delete(calendarItems);
    await db.delete(weeklyGoalBudgets);
    await db.delete(weeklyPlans);
    await db.delete(goalProgressEntries);
    await db.delete(goals);
    await db.delete(routineDefinitions);
    await db.delete(fixedCommitmentDefinitions);
    await db.delete(planChanges);
    await db.delete(backgroundJobs);
    await db.delete(integrationConnections);
    await db.delete(userSettings);
    await db.delete(userProfiles);
    return { deleted: true };
  });
}
