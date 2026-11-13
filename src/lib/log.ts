const secretKey = /token|secret|password|authorization|api[_-]?key|cookie/i;

export function redact(fields: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, secretKey.test(key) ? "[redacted]" : value]),
  );
}

export function logInfo(event: string, fields: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ level: "info", event, ...redact(fields), ts: new Date().toISOString() }));
}

export function logError(event: string, error: unknown, fields: Record<string, unknown> = {}): void {
  const message = error instanceof Error ? error.message : "unknown";
  console.error(JSON.stringify({
    level: "error",
    event,
    message,
    ...redact(fields),
    ts: new Date().toISOString(),
  }));
}
