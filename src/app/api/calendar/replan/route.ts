import { z } from "zod";
import { api } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { generateWeekPlan, replanCurrentWeek } from "@/services/planning";

const BodySchema = z.strictObject({
  reason: z.string().trim().min(1).max(300).optional(),
  source: z.enum(["ai", "system"]).default("system"),
  immediate: z.boolean().optional(),
});

export async function POST(request: Request) {
  return api(async () => {
    const user = await requireUser();
    const body = BodySchema.parse(await request.json().catch(() => ({})));
    if (body.source === "ai") {
      return generateWeekPlan(user.id, {
        reason: body.reason ?? "Prośba użytkownika o plan AI",
        actor: "ai",
        source: "ai",
      });
    }
    if (body.immediate) {
      return replanCurrentWeek(user.id, body.reason ?? "Ręczne przeliczenie", "user");
    }
    return generateWeekPlan(user.id, {
      reason: body.reason ?? "Plan systemowy",
      actor: "system",
      source: "system",
    });
  });
}
