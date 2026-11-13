import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { api } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { requireDb } from "@/db/client";
import { userProfiles } from "@/db/schema";
import {
  calendarItems,
  goalProgressEntries,
  goalSessions,
  goals,
  planChanges,
  userSettings,
  weeklyPlans,
} from "@/db/schema";

export async function GET() {
  return api(async () => {
    const user = await requireUser();
    const db = requireDb();
    const [profile, settings, goalRows, sessions, progress, plans, items, changes] = await Promise.all([
      db.select().from(userProfiles).where(eq(userProfiles.id, user.id)),
      db.select().from(userSettings).where(eq(userSettings.userId, user.id)),
      db.select().from(goals).where(eq(goals.userId, user.id)),
      db.select().from(goalSessions).where(eq(goalSessions.userId, user.id)),
      db.select().from(goalProgressEntries).where(eq(goalProgressEntries.userId, user.id)),
      db.select().from(weeklyPlans).where(eq(weeklyPlans.userId, user.id)),
      db.select().from(calendarItems).where(eq(calendarItems.userId, user.id)),
      db.select().from(planChanges).where(eq(planChanges.userId, user.id)),
    ]);
    return { profile, settings, goals: goalRows, sessions, progress, plans, items, changes };
  });
}

const DeleteSchema = z.strictObject({ confirmation: z.literal("USUŃ MOJE DANE") });

export async function DELETE(request: Request) {
  return api(async () => {
    const user = await requireUser();
    DeleteSchema.parse(await request.json());
    const db = requireDb();
    await db.delete(userProfiles).where(and(eq(userProfiles.id, user.id)));
    return { deleted: true };
  });
}
