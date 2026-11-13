import { api } from "@/lib/api";
import { CompleteSessionSchema } from "@/domain/schemas";
import { completeSession } from "@/services/sessions";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return api(async () => {
    const { id } = await context.params;
    return completeSession(id, CompleteSessionSchema.parse(await request.json()));
  });
}
