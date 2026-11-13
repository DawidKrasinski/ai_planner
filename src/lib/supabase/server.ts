import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { parseServerEnv } from "@/lib/env";

export async function createSupabaseServerClient() {
  const env = parseServerEnv(process.env);
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }
  const cookieStore = await cookies();
  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const cookie of cookiesToSet) {
            cookieStore.set(cookie.name, cookie.value, cookie.options);
          }
        } catch {
          // Server Components cannot set cookies. Proxy refreshes the session.
        }
      },
    },
  });
}
