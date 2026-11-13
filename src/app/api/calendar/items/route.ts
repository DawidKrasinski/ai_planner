import { api } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { CalendarItemSchema } from "@/domain/schemas";
import { ensureProfile } from "@/services/records";
import { createCalendarItem } from "@/services/planning";

export async function POST(request: Request) {
  return api(async () => {
    const user = await requireUser();
    await ensureProfile(user.id, user.email);
    const input = CalendarItemSchema.parse(await request.json());
    const itemType = input.itemType === "routine_occurrence" ? "one_off_event" : input.itemType;
    return createCalendarItem(user.id, { ...input, itemType });
  });
}
