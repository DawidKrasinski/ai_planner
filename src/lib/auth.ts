import "server-only";
import { AppError } from "@/lib/errors";
import { isAuthConfigured, parseServerEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CurrentUser = { id: string; email: string };

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const env = parseServerEnv(process.env);
  if (!isAuthConfigured(env)) {
    return null;
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return null;
  }
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email) {
    return null;
  }
  if (data.user.email.toLowerCase() !== env.ALLOWED_EMAIL?.toLowerCase()) {
    return null;
  }
  return { id: data.user.id, email: data.user.email };
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AppError("UNAUTHENTICATED", "Wymagane jest zalogowanie.", 401);
  }
  return user;
}
