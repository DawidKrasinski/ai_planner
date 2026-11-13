import { z } from "zod";
import { api } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { moveCalendarItem } from "@/services/planning";

const PatchSchema = z.strictObject({
  startAt: z.iso.datetime(),
  endAt: z.iso.datetime(),
  preference: z.enum(["once", "recurring"]).default("once"),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return api(async () => {
    const user = await requireUser();
    const { id } = await context.params;
    const body = PatchSchema.parse(await request.json());
    return moveCalendarItem(user.id, id, body.startAt, body.endAt, body.preference);
  });
}
