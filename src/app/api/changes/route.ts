import { api } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { listChanges, listPlans } from "@/services/records";

export async function GET() {
  return api(async () => {
    const user = await requireUser();
    const [changes, plans] = await Promise.all([listChanges(user.id), listPlans(user.id)]);
    return { changes, plans };
  });
}
