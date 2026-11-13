import { z } from "zod";
import { api } from "@/lib/api";
import { moveCalendarItem } from "@/services/planning";

const PatchSchema = z.strictObject({
  startAt: z.iso.datetime(),
  endAt: z.iso.datetime(),
  preference: z.enum(["once", "recurring"]).default("once"),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return api(async () => {
    const { id } = await context.params;
    const body = PatchSchema.parse(await request.json());
    return moveCalendarItem(id, body.startAt, body.endAt, body.preference);
  });
}
