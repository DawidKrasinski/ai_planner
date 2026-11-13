import { api } from "@/lib/api";
import { listMemory } from "@/services/records";

export async function GET() {
  return api(async () => {
    return listMemory();
  });
}
