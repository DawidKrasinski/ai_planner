import { api } from "@/lib/api";
import { syncGoogle } from "@/services/google";

export async function POST() {
  return api(async () => {
    return syncGoogle();
  });
}
