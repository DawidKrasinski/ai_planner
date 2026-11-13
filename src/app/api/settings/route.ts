import { api } from "@/lib/api";
import { SettingsSchema } from "@/domain/schemas";
import { getSettings, saveSettings } from "@/services/records";

export async function GET() {
  return api(async () => {
    return getSettings();
  });
}

export async function PUT(request: Request) {
  return api(async () => {
    return saveSettings(SettingsSchema.parse(await request.json()));
  });
}
