import { api } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { currentPlan } from "@/services/planning";

export async function GET() {
  return api(async () => {
    const user = await requireUser();
    return currentPlan(user.id);
  });
}
