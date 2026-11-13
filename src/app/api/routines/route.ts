import { api } from "@/lib/api";
import { RoutineSchema, CommitmentSchema } from "@/domain/schemas";
import { createCommitment, createRoutine } from "@/services/records";

export async function POST(request: Request) {
  return api(async () => {
    const body: unknown = await request.json();
    const kind = body && typeof body === "object" && "kind" in body ? body.kind : "routine";
    if (kind === "commitment") {
      return createCommitment(CommitmentSchema.parse(body));
    }
    return createRoutine(RoutineSchema.parse(body));
  });
}
