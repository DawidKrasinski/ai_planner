import { api } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { MemoryUpdateSchema } from "@/domain/schemas";
import { deleteMemory, replaceMemory } from "@/services/records";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return api(async () => {
    const user = await requireUser();
    const { id } = await context.params;
    const body = MemoryUpdateSchema.parse(await request.json());
    await replaceMemory(user.id, id, body.content, body.isUserConfirmed ?? true);
    return { id };
  });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  return api(async () => {
    const user = await requireUser();
    const { id } = await context.params;
    await deleteMemory(user.id, id);
    return { id };
  });
}
