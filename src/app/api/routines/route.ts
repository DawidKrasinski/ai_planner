import { api } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { RoutineSchema, CommitmentSchema } from "@/domain/schemas";
import { createCommitment, createRoutine } from "@/services/records";

export async function POST(request: Request) {
  return api(async () => {
    const user = await requireUser();
    const body: unknown = await request.json();
    const kind = body && typeof body === "object" && "kind" in body ? body.kind : "routine";
    if (kind === "commitment") {
      return createCommitment(user.id, CommitmentSchema.parse(body));
    }
    return createRoutine(user.id, RoutineSchema.parse(body));
  });
}
