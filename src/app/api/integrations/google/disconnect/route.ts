import { api } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { disconnectGoogle } from "@/services/google";

export async function POST() {
  return api(async () => {
    const user = await requireUser();
    await disconnectGoogle(user.id);
    return { status: "disconnected" };
  });
}
