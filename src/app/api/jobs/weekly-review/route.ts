import { api, assertCronOrUser } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { requireDb } from "@/db/client";
import { userProfiles } from "@/db/schema";
import { runWeeklyReview } from "@/services/reviews";

export async function POST(request: Request) {
  return api(async () => {
    const user = await getCurrentUser();
    assertCronOrUser(request, user);
    if (user) {
      return runWeeklyReview(user.id);
    }
    const db = requireDb();
    const profiles = await db.select().from(userProfiles);
    const results = [];
    for (const profile of profiles) {
      results.push({ userId: profile.id, result: await runWeeklyReview(profile.id) });
    }
    return { results };
  });
}
