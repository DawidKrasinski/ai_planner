import { api } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { SettingsSchema } from "@/domain/schemas";
import { ensureProfile, getSettings, saveSettings } from "@/services/records";

export async function GET() {
  return api(async () => {
    const user = await requireUser();
    await ensureProfile(user.id, user.email);
    return getSettings(user.id);
  });
}

export async function PUT(request: Request) {
  return api(async () => {
    const user = await requireUser();
    await ensureProfile(user.id, user.email);
    return saveSettings(user.id, SettingsSchema.parse(await request.json()));
  });
}
