import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAuthConfigured, parseServerEnv } from "@/lib/env";

const publicPaths = [/^\/login$/, /^\/api\/jobs\//, /^\/api\/integrations\/google\/callback$/];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (publicPaths.some((pattern) => pattern.test(pathname))) {
    return NextResponse.next();
  }
  const env = parseServerEnv(process.env);
  if (!isAuthConfigured(env) || !env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Uwierzytelnianie nie jest skonfigurowane." } }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }
  const response = NextResponse.next({ request });
  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const cookie of cookiesToSet) {
          request.cookies.set(cookie.name, cookie.value);
          response.cookies.set(cookie.name, cookie.value, cookie.options);
        }
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email?.toLowerCase();
  const allowed = email && email === env.ALLOWED_EMAIL?.toLowerCase();
  if (!allowed) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Wymagane jest zalogowanie." } }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
