import { api } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { CompleteSessionSchema } from "@/domain/schemas";
import { completeSession } from "@/services/sessions";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return api(async () => {
    const user = await requireUser();
    const { id } = await context.params;
    return completeSession(user.id, id, CompleteSessionSchema.parse(await request.json()));
  });
}
