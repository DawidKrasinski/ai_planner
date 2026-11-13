import { api } from "@/lib/api";
import { UpdateGoalSchema } from "@/domain/schemas";
import { getGoal, updateGoal } from "@/services/records";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return api(async () => {
    const { id } = await context.params;
    return getGoal(id);
  });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return api(async () => {
    const { id } = await context.params;
    const patch = UpdateGoalSchema.parse(await request.json());
    return updateGoal(id, patch);
  });
}
