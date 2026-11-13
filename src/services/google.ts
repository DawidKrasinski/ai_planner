import "server-only";
import { and, eq } from "drizzle-orm";
import { requireDb } from "@/db/client";
import { calendarItems, integrationConnections } from "@/db/schema";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { isGoogleConfigured, parseServerEnv } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { getProfile } from "./records";
import { replanCurrentWeek } from "./planning";

const readonlyScope = "https://www.googleapis.com/auth/calendar.readonly";
const exportScope = "https://www.googleapis.com/auth/calendar.events";

export function googleStatus() {
  const env = parseServerEnv(process.env);
  return {
    configured: isGoogleConfigured(env),
    exportAvailable: Boolean(env.GOOGLE_CLIENT_ID),
  };
}

export function googleAuthUrl(state: string, exportEnabled: boolean) {
  const env = parseServerEnv(process.env);
  if (!isGoogleConfigured(env) || !env.GOOGLE_CLIENT_ID || !env.GOOGLE_REDIRECT_URI) {
    throw new AppError("INTEGRATION_NOT_CONNECTED", "Integracja Google Calendar nie jest skonfigurowana.", 503);
  }
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", env.GOOGLE_REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  url.searchParams.set("scope", exportEnabled ? `${readonlyScope} ${exportScope}` : readonlyScope);
  return url.toString();
}

export async function storeGoogleCode(code: string, exportEnabled: boolean) {
  const env = parseServerEnv(process.env);
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI || !env.TOKEN_ENCRYPTION_KEY) {
    throw new AppError("INTEGRATION_NOT_CONNECTED", "Brakuje konfiguracji OAuth albo klucza szyfrowania.", 503);
  }
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });
  if (!response.ok) {
    throw new AppError("SYNC_CONFLICT", "Google odrzucił autoryzację. Dane kalendarza nie zostały zmienione.", 502);
  }
  const payload: unknown = await response.json();
  const refresh = typeof payload === "object" && payload && "refresh_token" in payload ? String(payload.refresh_token) : "";
  if (!refresh) {
    throw new AppError("SYNC_CONFLICT", "Google nie zwrócił tokenu odświeżania.", 502);
  }
  const db = requireDb();
  const encrypted = encryptSecret(refresh, env.TOKEN_ENCRYPTION_KEY);
  await db.insert(integrationConnections).values({
    provider: "google",
    encryptedRefreshToken: encrypted,
    scopes: [exportEnabled ? exportScope : readonlyScope],
    status: "connected",
    exportEnabled,
    connectedAt: new Date(),
  }).onConflictDoUpdate({
    target: [integrationConnections.provider],
    set: {
      encryptedRefreshToken: encrypted,
      scopes: [exportEnabled ? exportScope : readonlyScope],
      status: "connected",
      exportEnabled,
      connectedAt: new Date(),
      lastError: null,
    },
  });
}

export async function disconnectGoogle() {
  const db = requireDb();
  await db.update(integrationConnections).set({
    status: "disconnected",
    encryptedRefreshToken: null,
    lastError: null,
  }).where(and(eq(integrationConnections.provider, "google")));
}

export async function syncGoogle() {
  const env = parseServerEnv(process.env);
  const db = requireDb();
  const connection = (await db.select().from(integrationConnections).where(and(
    eq(integrationConnections.provider, "google"),
  )).limit(1))[0];
  if (!connection || connection.status !== "connected" || !connection.encryptedRefreshToken || !env.TOKEN_ENCRYPTION_KEY) {
    throw new AppError("INTEGRATION_NOT_CONNECTED", "Google Calendar nie jest połączony.", 409);
  }
  try {
    const refresh = decryptSecret(connection.encryptedRefreshToken, env.TOKEN_ENCRYPTION_KEY);
    const access = await refreshAccessToken(refresh);
    const profile = await getProfile();
    const imported = await importEvents(access, profile.timezone);
    let exported = 0;
    if (connection.exportEnabled) {
      exported = await exportEvents(access);
    }
    await db.update(integrationConnections).set({ lastSyncAt: new Date(), lastError: null }).where(eq(integrationConnections.id, connection.id));
    if (imported > 0) {
      await replanCurrentWeek("Synchronizacja zewnętrznych wydarzeń.", "system");
    }
    return { imported, exported };
  } catch (error) {
    await db.update(integrationConnections).set({
      lastError: error instanceof Error ? error.message : "sync_failed",
    }).where(eq(integrationConnections.id, connection.id));
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("SYNC_CONFLICT", "Synchronizacja nie powiodła się. Wewnętrzny kalendarz pozostał bez zmian.", 502);
  }
}

async function refreshAccessToken(refreshToken: string) {
  const env = parseServerEnv(process.env);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID ?? "",
      client_secret: env.GOOGLE_CLIENT_SECRET ?? "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) {
    throw new AppError("SYNC_CONFLICT", "Nie udało się odświeżyć dostępu do Google.", 502);
  }
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== "object" || !("access_token" in payload)) {
    throw new AppError("SYNC_CONFLICT", "Odpowiedź Google jest niekompletna.", 502);
  }
  return String(payload.access_token);
}

async function importEvents(accessToken: string, timezone: string) {
  const timeMin = new Date().toISOString();
  const timeMax = new Date(Date.now() + 14 * 86_400_000).toISOString();
  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.set("timeMin", timeMin);
  url.searchParams.set("timeMax", timeMax);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  const response = await fetch(url, { headers: { authorization: `Bearer ${accessToken}` } });
  if (!response.ok) {
    throw new AppError("SYNC_CONFLICT", "Nie udało się odczytać wydarzeń Google.", 502);
  }
  const payload: unknown = await response.json();
  const items = payload && typeof payload === "object" && "items" in payload && Array.isArray(payload.items) ? payload.items : [];
  const db = requireDb();
  let imported = 0;
  for (const item of items) {
    if (!item || typeof item !== "object" || !("id" in item)) {
      continue;
    }
    const record = item as { id: string; summary?: string; etag?: string; start?: { dateTime?: string }; end?: { dateTime?: string } };
    if (!record.start?.dateTime || !record.end?.dateTime) {
      continue;
    }
    const existing = (await db.select().from(calendarItems).where(and(
      eq(calendarItems.externalId, record.id),
    )).limit(1))[0];
    if (existing?.externalEtag === record.etag) {
      continue;
    }
    if (existing) {
      await db.update(calendarItems).set({
        title: record.summary || "Wydarzenie Google",
        startAt: new Date(record.start.dateTime),
        endAt: new Date(record.end.dateTime),
        externalEtag: record.etag ?? null,
        updatedAt: new Date(),
      }).where(eq(calendarItems.id, existing.id));
    } else {
      await db.insert(calendarItems).values({
        itemType: "one_off_event",
        title: record.summary || "Wydarzenie Google",
        startAt: new Date(record.start.dateTime),
        endAt: new Date(record.end.dateTime),
        timezone,
        isFixed: true,
        externalId: record.id,
        externalEtag: record.etag ?? null,
        placementReason: "Zaimportowane z Google Calendar.",
      });
    }
    imported += 1;
  }
  return imported;
}

async function exportEvents(accessToken: string) {
  const db = requireDb();
  const items = await db.select().from(calendarItems).where(and(
    eq(calendarItems.itemType, "goal_session"),
    eq(calendarItems.aiGenerated, true),
  ));
  let exported = 0;
  for (const item of items) {
    if (item.externalId) {
      continue;
    }
    const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
      body: JSON.stringify({
        summary: item.title,
        start: { dateTime: item.startAt.toISOString() },
        end: { dateTime: item.endAt.toISOString() },
        description: "Wyeksportowane z AI Personal Manager.",
      }),
    });
    if (!response.ok) {
      continue;
    }
    const payload: unknown = await response.json();
    if (payload && typeof payload === "object" && "id" in payload) {
      await db.update(calendarItems).set({ externalId: String(payload.id) }).where(eq(calendarItems.id, item.id));
      exported += 1;
    }
  }
  return exported;
}
