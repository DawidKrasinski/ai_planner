import { api } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { CreateGoalSchema } from "@/domain/schemas";
import { createGoal, ensureProfile, listGoals } from "@/services/records";

export async function GET() {
  return api(async () => {
    const user = await requireUser();
    await ensureProfile(user.id, user.email);
    return listGoals(user.id);
  });
}

export async function POST(request: Request) {
  return api(async () => {
    const user = await requireUser();
    await ensureProfile(user.id, user.email);
    const input = CreateGoalSchema.parse(await request.json());
    return createGoal(user.id, input, "user");
  });
}
