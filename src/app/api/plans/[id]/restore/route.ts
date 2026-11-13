import { api } from "@/lib/api";
import { restorePlan } from "@/services/planning";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  return api(async () => {
    const { id } = await context.params;
    return restorePlan(id);
  });
}
