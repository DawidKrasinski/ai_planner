import { z } from "zod";
import { api } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { ensureProfile, getProfile, updateProfile } from "@/services/records";

const PatchSchema = z.strictObject({
  displayName: z.string().trim().min(1).max(80).optional(),
  timezone: z.string().trim().min(1).max(80).optional(),
});

export async function GET() {
  return api(async () => {
    const user = await requireUser();
    await ensureProfile(user.id, user.email);
    return getProfile(user.id);
  });
}

export async function PATCH(request: Request) {
  return api(async () => {
    const user = await requireUser();
    const body = PatchSchema.parse(await request.json());
    return updateProfile(user.id, body);
  });
}
