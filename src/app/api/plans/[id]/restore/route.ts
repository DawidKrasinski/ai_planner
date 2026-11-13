import { api } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { restorePlan } from "@/services/planning";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  return api(async () => {
    const user = await requireUser();
    const { id } = await context.params;
    return restorePlan(user.id, id);
  });
}
