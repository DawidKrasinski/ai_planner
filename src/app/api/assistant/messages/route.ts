import { api } from "@/lib/api";
import { AssistantRequestSchema } from "@/domain/schemas";
import { recentMessages, sendAssistantMessage } from "@/services/assistant";

export async function GET() {
  return api(async () => {
    return recentMessages();
  });
}

export async function POST(request: Request) {
  return api(async () => {
    const body = AssistantRequestSchema.parse(await request.json());
    return sendAssistantMessage(body.message, body.screen);
  });
}
