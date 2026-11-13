import { api, assertCron } from "@/lib/api";
import { runWeeklyReview } from "@/services/reviews";

export async function POST(request: Request) {
  return api(async () => {
    assertCron(request);
    return runWeeklyReview();
  });
}
