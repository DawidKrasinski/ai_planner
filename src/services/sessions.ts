import "server-only";
import { and, eq, gte, lte } from "drizzle-orm";
import { requireDb } from "@/db/client";
import { calendarItems, goalSessions, goals } from "@/db/schema";
import { effectiveMinutes } from "@/domain/metrics";
import { shiftAfterEarlyCompletion } from "@/services/planning";
import { AppError } from "@/lib/errors";
import { localIsoDate, zonedTimestamp } from "@/domain/time";
import { addProgress, getProfile, recordChange } from "./records";

export async function startSession(userId: string, sessionId: string) {
  const db = requireDb();
  const session = await mustSession(userId, sessionId);
  await db.update(goalSessions).set({
    completionStatus: "in_progress",
    startedAt: session.startedAt ?? new Date(),
    updatedAt: new Date(),
  }).where(eq(goalSessions.id, sessionId));
  return mustSession(userId, sessionId);
}

export async function completeSession(userId: string, sessionId: string, input: {
  actualMinutes: number;
  efficiencyRating: number;
  completionStatus: "partial" | "completed" | "skipped";
  notes?: string;
  progressValue?: number;
  pullForward?: boolean;
}) {
  const db = requireDb();
  const session = await mustSession(userId, sessionId);
  if (input.completionStatus === "skipped") {
    await db.update(goalSessions).set({
      completionStatus: "skipped",
      actualMinutes: 0,
      efficiencyRating: null,
      effectiveMinutes: "0",
      notes: input.notes ?? "",
      endedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(goalSessions.id, sessionId));
    if (session.calendarItemId) {
      await db.update(calendarItems).set({ status: "skipped", updatedAt: new Date() }).where(eq(calendarItems.id, session.calendarItemId));
    }
    await recordChange(db, userId, null, "session_skipped", "user", "Pominięta sesja nie wymusza natychmiastowego przeliczenia planu.", { sessionId }, { sessionId });
    return mustSession(userId, sessionId);
  }
  const effective = effectiveMinutes(input.actualMinutes, input.efficiencyRating);
  await db.update(goalSessions).set({
    completionStatus: input.completionStatus,
    actualMinutes: input.actualMinutes,
    efficiencyRating: input.efficiencyRating,
    effectiveMinutes: String(effective),
    notes: input.notes ?? "",
    endedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(goalSessions.id, sessionId));
  if (session.calendarItemId) {
    const item = (await db.select().from(calendarItems).where(eq(calendarItems.id, session.calendarItemId)).limit(1))[0];
    if (item && input.pullForward && input.actualMinutes < session.plannedMinutes) {
      const profile = await getProfile(userId);
      const actualEnd = new Date(item.startAt.getTime() + input.actualMinutes * 60_000);
      const day = localIsoDate(item.startAt, profile.timezone);
      const dayEnd = new Date(zonedTimestamp(day, "23:59", profile.timezone));
      const later = await db.select().from(calendarItems).where(and(
        eq(calendarItems.userId, userId),
        gte(calendarItems.startAt, item.endAt),
        lte(calendarItems.startAt, dayEnd),
      ));
      const shifted = shiftAfterEarlyCompletion([
        { id: item.id, title: item.title, start: item.startAt.getTime(), end: actualEnd.getTime(), fixed: true, locked: true, preserved: true, kind: item.itemType, reason: item.placementReason },
        ...later.map((entry) => ({
          id: entry.id,
          title: entry.title,
          start: entry.startAt.getTime(),
          end: entry.endAt.getTime(),
          fixed: entry.isFixed || entry.isUserLocked,
          locked: entry.isUserLocked,
          preserved: entry.status !== "scheduled",
          kind: entry.itemType,
          reason: entry.placementReason,
        })),
      ], actualEnd.getTime(), item.endAt.getTime());
      for (const block of shifted) {
        if (block.id === item.id) {
          continue;
        }
        await db.update(calendarItems).set({
          startAt: new Date(block.start),
          endAt: new Date(block.end),
          updatedAt: new Date(),
        }).where(eq(calendarItems.id, block.id));
      }
      await db.update(calendarItems).set({
        endAt: actualEnd,
        status: input.completionStatus === "completed" ? "completed" : "partial",
        updatedAt: new Date(),
      }).where(eq(calendarItems.id, item.id));
    } else {
      await db.update(calendarItems).set({
        status: input.completionStatus === "completed" ? "completed" : "partial",
        updatedAt: new Date(),
      }).where(eq(calendarItems.id, session.calendarItemId));
    }
  }
  if (input.progressValue !== undefined) {
    const goal = (await db.select().from(goals).where(eq(goals.id, session.goalId)).limit(1))[0];
    await addProgress(userId, session.goalId, {
      progressValue: input.progressValue,
      progressMethod: goal?.progressMethod ?? "percent",
      notes: input.notes,
      source: "user",
    });
  }
  await recordChange(db, userId, null, "session_completed", "user", "Zapisano rzeczywisty czas i efektywność.", null, {
    sessionId,
    actualMinutes: input.actualMinutes,
    efficiencyRating: input.efficiencyRating,
    effectiveMinutes: effective,
  });
  return mustSession(userId, sessionId);
}

async function mustSession(userId: string, sessionId: string) {
  const db = requireDb();
  const session = (await db.select().from(goalSessions).where(and(eq(goalSessions.userId, userId), eq(goalSessions.id, sessionId))).limit(1))[0];
  if (!session) {
    throw new AppError("NOT_FOUND", "Nie znaleziono sesji.", 404);
  }
  return session;
}
