import { api, assertCronOrUser } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { requireDb } from "@/db/client";
import { userProfiles } from "@/db/schema";
import { runEveningReview } from "@/services/reviews";

export async function POST(request: Request) {
  return api(async () => {
    const user = await getCurrentUser();
    assertCronOrUser(request, user);
    if (user) {
      return runEveningReview(user.id);
    }
    const db = requireDb();
    const profiles = await db.select().from(userProfiles);
    const results = [];
    for (const profile of profiles) {
      results.push({ userId: profile.id, result: await runEveningReview(profile.id) });
    }
    return { results };
  });
}
