import { api } from "@/lib/api";
import { currentPlan } from "@/services/planning";

export async function GET() {
  return api(async () => {
    return currentPlan();
  });
}
