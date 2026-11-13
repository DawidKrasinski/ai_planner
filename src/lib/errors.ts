export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "SCHEDULING_CONFLICT"
  | "INSUFFICIENT_CAPACITY"
  | "AI_PROVIDER_UNAVAILABLE"
  | "AI_OUTPUT_INVALID"
  | "INTEGRATION_NOT_CONNECTED"
  | "SYNC_CONFLICT"
  | "JOB_ALREADY_RUNNING"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
