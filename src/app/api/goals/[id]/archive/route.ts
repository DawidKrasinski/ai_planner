import { api } from "@/lib/api";
import { updateGoal } from "@/services/records";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  return api(async () => {
    const { id } = await context.params;
    return updateGoal(id, { status: "archived" });
  });
}
