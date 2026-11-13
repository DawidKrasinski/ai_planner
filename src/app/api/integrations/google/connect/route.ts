import { cookies } from "next/headers";
import { api } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/services/records";
import { googleAuthUrl } from "@/services/google";

export async function POST() {
  return api(async () => {
    const user = await requireUser();
    const state = crypto.randomUUID();
    const cookieStore = await cookies();
    const settings = await getSettings(user.id);
    const exportEnabled = settings.googleExportEnabled;
    cookieStore.set("google_oauth_state", `${state}:${user.id}:${exportEnabled ? "1" : "0"}`, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600,
    });
    return { url: googleAuthUrl(state, exportEnabled) };
  });
}
