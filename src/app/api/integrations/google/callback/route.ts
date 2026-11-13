import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { storeGoogleCode } from "@/services/google";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const stored = cookieStore.get("google_oauth_state")?.value;
  const user = await getCurrentUser();
  const [storedState, storedUser, exportFlag] = stored?.split(":") ?? [];
  if (!code || !state || !stored || !user || storedState !== state || storedUser !== user.id) {
    return NextResponse.redirect(new URL("/settings?google=error", url.origin));
  }
  try {
    await storeGoogleCode(user.id, code, exportFlag === "1");
    return NextResponse.redirect(new URL("/settings?google=connected", url.origin));
  } catch {
    return NextResponse.redirect(new URL("/settings?google=error", url.origin));
  }
}
