import { api } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { syncGoogle } from "@/services/google";

export async function POST() {
  return api(async () => {
    const user = await requireUser();
    return syncGoogle(user.id);
  });
}
