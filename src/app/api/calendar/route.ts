import { z } from "zod";
import { api } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { zonedTimestamp } from "@/domain/time";
import { getProfile, listCalendar } from "@/services/records";

const QuerySchema = z.object({
  start: z.iso.date(),
  end: z.iso.date(),
});

export async function GET(request: Request) {
  return api(async () => {
    const user = await requireUser();
    const url = new URL(request.url);
    const query = QuerySchema.parse({
      start: url.searchParams.get("start"),
      end: url.searchParams.get("end"),
    });
    const profile = await getProfile(user.id);
    return listCalendar(
      user.id,
      new Date(zonedTimestamp(query.start, "00:00", profile.timezone)),
      new Date(zonedTimestamp(query.end, "23:59", profile.timezone)),
    );
  });
}
