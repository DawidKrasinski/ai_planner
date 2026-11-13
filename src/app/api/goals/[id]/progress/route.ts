import { api } from "@/lib/api";
import { ProgressEntrySchema } from "@/domain/schemas";
import { addProgress } from "@/services/records";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return api(async () => {
    const { id } = await context.params;
    return addProgress(id, ProgressEntrySchema.parse(await request.json()));
  });
}
