import { api } from "@/lib/api";
import { MemoryUpdateSchema } from "@/domain/schemas";
import { deleteMemory, replaceMemory } from "@/services/records";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return api(async () => {
    const { id } = await context.params;
    const body = MemoryUpdateSchema.parse(await request.json());
    await replaceMemory(id, body.content, body.isUserConfirmed ?? true);
    return { id };
  });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  return api(async () => {
    const { id } = await context.params;
    await deleteMemory(id);
    return { id };
  });
}
