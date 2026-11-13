import { api } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { ProgressEntrySchema } from "@/domain/schemas";
import { addProgress } from "@/services/records";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return api(async () => {
    const user = await requireUser();
    const { id } = await context.params;
    return addProgress(user.id, id, ProgressEntrySchema.parse(await request.json()));
  });
}
