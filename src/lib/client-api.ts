import { z } from "zod";

const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string().optional(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

const ApiSuccessSchema = z.object({
  data: z.unknown(),
});

export class ClientApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: unknown;

  constructor(message: string, options: { code?: string; status?: number; details?: unknown } = {}) {
    super(message);
    this.name = "ClientApiError";
    this.code = options.code ?? "CLIENT_ERROR";
    this.status = options.status ?? 500;
    this.details = options.details ?? null;
  }
}

export async function clientApi<T>(
  input: string,
  init?: RequestInit,
  schema?: z.ZodType<T>,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(input, {
      ...init,
      headers: {
        ...(init?.body ? { "content-type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ClientApiError("Nie udało się połączyć z serwerem.", { code: "NETWORK_ERROR", status: 0 });
  }

  let body: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      throw new ClientApiError("Serwer zwrócił niepoprawną odpowiedź.", {
        code: "INVALID_JSON",
        status: response.status,
      });
    }
  }

  if (!response.ok) {
    const parsed = ApiErrorSchema.safeParse(body);
    if (parsed.success) {
      throw new ClientApiError(parsed.data.error.message, {
        code: parsed.data.error.code,
        status: response.status,
        details: parsed.data.error.details,
      });
    }
    throw new ClientApiError("Wystąpił błąd żądania.", { code: "HTTP_ERROR", status: response.status });
  }

  const success = ApiSuccessSchema.safeParse(body);
  if (!success.success) {
    throw new ClientApiError("Odpowiedź API nie zawiera pola data.", {
      code: "INVALID_RESPONSE",
      status: response.status,
    });
  }

  if (!schema) {
    return success.data.data as T;
  }

  const validated = schema.safeParse(success.data.data);
  if (!validated.success) {
    throw new ClientApiError("Dane z API nie przeszły walidacji.", {
      code: "RESPONSE_VALIDATION_ERROR",
      status: response.status,
      details: validated.error.issues,
    });
  }
  return validated.data;
}
