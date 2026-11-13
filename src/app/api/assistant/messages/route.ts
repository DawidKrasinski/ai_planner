import { api } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { AssistantRequestSchema } from "@/domain/schemas";
import { recentMessages, sendAssistantMessage } from "@/services/assistant";

export async function GET() {
  return api(async () => {
    const user = await requireUser();
    return recentMessages(user.id);
  });
}

export async function POST(request: Request) {
  return api(async () => {
    const user = await requireUser();
    const body = AssistantRequestSchema.parse(await request.json());
    return sendAssistantMessage(user.id, body.message, body.screen);
  });
}
