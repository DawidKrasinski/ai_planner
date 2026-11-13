import { api } from "@/lib/api";
import { disconnectGoogle } from "@/services/google";

export async function POST() {
  return api(async () => {
    await disconnectGoogle();
    return { status: "disconnected" };
  });
}
