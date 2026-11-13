import { ZodError } from "zod";
import { AppError, isAppError } from "@/lib/errors";
import { logError } from "@/lib/log";

export function errorResponse(error: unknown): Response {
  if (error instanceof ZodError) {
    return Response.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Dane nie przeszły walidacji.",
          details: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
      },
      { status: 400 },
    );
  }
  if (isAppError(error)) {
    return Response.json(
      { error: { code: error.code, message: error.message, details: error.details ?? null } },
      { status: error.status },
    );
  }
  logError("api.unhandled", error);
  return Response.json(
    { error: { code: "INTERNAL_ERROR", message: "Wystąpił nieoczekiwany błąd." } },
    { status: 500 },
  );
}

export async function api<T>(work: () => Promise<T>): Promise<Response> {
  try {
    return Response.json({ data: await work() });
  } catch (error) {
    return errorResponse(error);
  }
}

export function assertCronOrUser(request: Request, user: { id: string } | null): void {
  const envSecret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (envSecret && header === `Bearer ${envSecret}`) {
    return;
  }
  if (user) {
    return;
  }
  throw new AppError("UNAUTHENTICATED", "Brak uprawnień do uruchomienia zadania.", 401);
}
