import { api } from "@/lib/api";
import { CalendarItemSchema } from "@/domain/schemas";
import { createCalendarItem } from "@/services/planning";

export async function POST(request: Request) {
  return api(async () => {
    const input = CalendarItemSchema.parse(await request.json());
    const itemType = input.itemType === "routine_occurrence" ? "one_off_event" : input.itemType;
    return createCalendarItem({ ...input, itemType });
  });
}
