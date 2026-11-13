import { api } from "@/lib/api";
import { listChanges, listPlans } from "@/services/records";

export async function GET() {
  return api(async () => {
    const [changes, plans] = await Promise.all([listChanges(), listPlans()]);
    return { changes, plans };
  });
}
