import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { storeGoogleCode } from "@/services/google";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const stored = cookieStore.get("google_oauth_state")?.value;
  const [storedState, exportFlag] = stored?.split(":") ?? [];
  if (!code || !state || !stored || storedState !== state) {
    return NextResponse.redirect(new URL("/settings?google=error", url.origin));
  }
  try {
    await storeGoogleCode(code, exportFlag === "1");
    return NextResponse.redirect(new URL("/settings?google=connected", url.origin));
  } catch {
    return NextResponse.redirect(new URL("/settings?google=error", url.origin));
  }
}
