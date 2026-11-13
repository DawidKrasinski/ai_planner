import { z } from "zod";
import { api } from "@/lib/api";
import { getProfile, updateProfile } from "@/services/records";

const PatchSchema = z.strictObject({
  displayName: z.string().trim().min(1).max(80).optional(),
  timezone: z.string().trim().min(1).max(80).optional(),
});

export async function GET() {
  return api(async () => {
    return getProfile();
  });
}

export async function PATCH(request: Request) {
  return api(async () => {
    const body = PatchSchema.parse(await request.json());
    return updateProfile(body);
  });
}
