import { api, assertCron } from "@/lib/api";
import { runEveningReview } from "@/services/reviews";

export async function POST(request: Request) {
  return api(async () => {
    assertCron(request);
    return runEveningReview();
  });
}
