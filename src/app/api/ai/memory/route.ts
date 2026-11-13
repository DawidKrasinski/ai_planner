import { api } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { listMemory } from "@/services/records";

export async function GET() {
  return api(async () => {
    const user = await requireUser();
    return listMemory(user.id);
  });
}
