import { z } from "zod";
import { api } from "@/lib/api";
import { getAnalytics } from "@/services/analytics";

const periods = z.enum(["today", "yesterday", "7d", "30d", "3m", "1y", "all"]);

export async function GET(request: Request) {
  return api(async () => {
    const period = periods.parse(new URL(request.url).searchParams.get("period") ?? "7d");
    return getAnalytics(period);
  });
}
