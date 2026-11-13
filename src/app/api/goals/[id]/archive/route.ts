import { api } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { updateGoal } from "@/services/records";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  return api(async () => {
    const user = await requireUser();
    const { id } = await context.params;
    return updateGoal(user.id, id, { status: "archived" });
  });
}
