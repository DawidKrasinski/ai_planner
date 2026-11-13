import { isAppError } from "@/lib/errors";

export async function loadPage<T>(work: () => Promise<T>): Promise<
  { ok: true; data: T } | { ok: false; message: string; code?: string }
> {
  try {
    return { ok: true, data: await work() };
  } catch (error) {
    if (isAppError(error)) {
      return { ok: false, message: error.message, code: error.code };
    }
    return { ok: false, message: "Nie udało się wczytać danych." };
  }
}
