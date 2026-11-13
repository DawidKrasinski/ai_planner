import { api } from "@/lib/api";
import { startSession } from "@/services/sessions";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  return api(async () => {
    const { id } = await context.params;
    return startSession(id);
  });
}
