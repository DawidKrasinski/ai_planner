import { api } from "@/lib/api";
import { CreateGoalSchema } from "@/domain/schemas";
import { createGoal, listGoals } from "@/services/records";

export async function GET() {
  return api(async () => {
    return listGoals();
  });
}

export async function POST(request: Request) {
  return api(async () => {
    const input = CreateGoalSchema.parse(await request.json());
    return createGoal(input, "user");
  });
}
