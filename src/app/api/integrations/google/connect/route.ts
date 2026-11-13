import { cookies } from "next/headers";
import { api } from "@/lib/api";
import { getSettings } from "@/services/records";
import { googleAuthUrl } from "@/services/google";

export async function POST() {
  return api(async () => {
    const state = crypto.randomUUID();
    const cookieStore = await cookies();
    const settings = await getSettings();
    const exportEnabled = settings.googleExportEnabled;
    cookieStore.set("google_oauth_state", `${state}:${exportEnabled ? "1" : "0"}`, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600,
    });
    return { url: googleAuthUrl(state, exportEnabled) };
  });
}
