import "server-only";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import type { ZodType } from "zod";
import { AppError } from "@/lib/errors";
import { isAiConfigured, parseServerEnv } from "@/lib/env";
import { logInfo } from "@/lib/log";
import { allocateBaselineBudgets, type BudgetGoal } from "@/domain/budgets";
import { AssistantOutputSchema, BudgetProposalSchema } from "@/domain/schemas";

export type AiUsage = { inputTokens: number; outputTokens: number };

export type StructuredRequest<T> = {
  task: string;
  system: string;
  prompt: string;
  schema: ZodType<T>;
};

export interface AIProvider {
  readonly id: "openai" | "anthropic" | "mock";
  readonly configured: boolean;
  generateStructured<T>(request: StructuredRequest<T>): Promise<{ output: T; usage: AiUsage }>;
  generateText(request: { task: string; system: string; prompt: string }): Promise<string>;
}

export function getAIProvider(): AIProvider {
  const env = parseServerEnv(process.env);
  if (!isAiConfigured(env)) {
    return new UnavailableProvider(env.AI_PROVIDER === "anthropic" ? "anthropic" : "openai");
  }
  if (env.AI_PROVIDER === "openai") {
    return new OpenAIProvider(env.OPENAI_MODEL);
  }
  if (env.AI_PROVIDER === "anthropic") {
    return new AnthropicProvider(env.ANTHROPIC_MODEL);
  }
  return new MockProvider();
}

class UnavailableProvider implements AIProvider {
  readonly configured = false;
  constructor(readonly id: "openai" | "anthropic") {}

  generateStructured<T>(): Promise<{ output: T; usage: AiUsage }> {
    return Promise.reject(new AppError("AI_PROVIDER_UNAVAILABLE", "Dostawca AI nie jest skonfigurowany.", 503));
  }

  generateText(): Promise<string> {
    return Promise.reject(new AppError("AI_PROVIDER_UNAVAILABLE", "Dostawca AI nie jest skonfigurowany.", 503));
  }
}

class OpenAIProvider implements AIProvider {
  readonly id = "openai" as const;
  readonly configured = true;
  constructor(private readonly modelName: string) {}

  async generateStructured<T>(request: StructuredRequest<T>) {
    return callModel(openai(this.modelName), "openai", request);
  }

  async generateText(request: { task: string; system: string; prompt: string }) {
    const { object } = await generateObject({
      model: openai(this.modelName),
      schema: AssistantOutputSchema,
      system: request.system,
      prompt: request.prompt,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(20_000),
    });
    return object.reply;
  }
}

class AnthropicProvider implements AIProvider {
  readonly id = "anthropic" as const;
  readonly configured = true;
  constructor(private readonly modelName: string) {}

  async generateStructured<T>(request: StructuredRequest<T>) {
    return callModel(anthropic(this.modelName), "anthropic", request);
  }

  async generateText(request: { task: string; system: string; prompt: string }) {
    const { object } = await generateObject({
      model: anthropic(this.modelName),
      schema: AssistantOutputSchema,
      system: request.system,
      prompt: request.prompt,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(20_000),
    });
    return object.reply;
  }
}

async function callModel<T>(
  model: Parameters<typeof generateObject>[0]["model"],
  provider: string,
  request: StructuredRequest<T>,
): Promise<{ output: T; usage: AiUsage }> {
  const started = Date.now();
  try {
    const result = await generateObject({
      model,
      schema: request.schema,
      system: request.system,
      prompt: request.prompt,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(25_000),
    });
    const parsed = request.schema.safeParse(result.object);
    if (!parsed.success) {
      throw new AppError("AI_OUTPUT_INVALID", "Odpowiedź modelu nie przeszła walidacji.", 422);
    }
    logInfo("ai.completed", {
      provider,
      task: request.task,
      latencyMs: Date.now() - started,
      inputTokens: result.usage.inputTokens ?? 0,
      outputTokens: result.usage.outputTokens ?? 0,
    });
    return {
      output: parsed.data,
      usage: { inputTokens: result.usage.inputTokens ?? 0, outputTokens: result.usage.outputTokens ?? 0 },
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logInfo("ai.failed", { provider, task: request.task, latencyMs: Date.now() - started });
    throw new AppError("AI_PROVIDER_UNAVAILABLE", "Dostawca AI jest chwilowo niedostępny. Bieżący plan pozostał bez zmian.", 503);
  }
}

class MockProvider implements AIProvider {
  readonly id = "mock" as const;
  readonly configured = true;

  async generateStructured<T>(request: StructuredRequest<T>) {
    const output = request.schema.parse(mockObject(request));
    return { output, usage: { inputTokens: 0, outputTokens: 0 } };
  }

  async generateText() {
    return "To jest lokalny adapter testowy, a nie odpowiedź modelu.";
  }
}

function mockObject(request: StructuredRequest<unknown>): unknown {
  if (request.task === "budget") {
    const goals = readGoals(request.prompt);
    const budgets = allocateBaselineBudgets(goals, readBudgets(request.prompt));
    return BudgetProposalSchema.parse({
      summary: "Lokalny adapter rozdzielił budżet proporcjonalnie do pilności. To nie jest decyzja modelu.",
      goals: budgets.map((budget) => ({
        goalId: budget.goalId,
        minutes: budget.minutes,
        rationale: budget.reason,
        confidence: 0.4,
        allowTrainingBorrow: budget.allowTrainingBorrow,
        allowSleepBorrow: false,
        needsClarification: false,
      })),
    });
  }
  const message = request.prompt.split("USER_MESSAGE:").at(1)?.trim() ?? "";
  if (message.length < 8) {
    return {
      reply: "Potrzebuję doprecyzowania, zanim powstanie propozycja celu.",
      proposal: { type: "clarification", questions: ["Jak ma się nazywać ten cel i jaki ma być rezultat?"] },
    };
  }
  const category = /trening|siłown|bieg|wspin/i.test(message)
    ? "training"
    : /odpocz|hobby|film|spacer/i.test(message)
      ? "leisure"
      : "learning_work";
  return AssistantOutputSchema.parse({
    reply: "To jest propozycja lokalnego adaptera. Cel nie zostanie zapisany bez Twojego potwierdzenia.",
    proposal: {
      type: "goal_draft",
      draft: {
        name: message.slice(0, 80),
        description: message.slice(0, 500),
        category,
        manualPriority: 3,
        difficulty: 5,
        difficultyIsEstimate: true,
        progressMethod: "percent",
        currentLevel: null,
        desiredLevel: null,
        deadlineAt: null,
        planningNotes: "Trudność jest szacunkiem lokalnego adaptera i można ją zmienić.",
        questions: [],
      },
    },
  });
}

function readBudgets(prompt: string): { training: number; learning_work: number; leisure: number } {
  const match = prompt.match(/BUDGETS_JSON:(\{[\s\S]*?\})/);
  const fallback = { training: 360, learning_work: 1200, leisure: 420 };
  if (!match?.[1]) {
    return fallback;
  }
  const parsed: unknown = JSON.parse(match[1]);
  if (!parsed || typeof parsed !== "object") {
    return fallback;
  }
  const record = parsed as Record<string, unknown>;
  if (typeof record.training !== "number" || typeof record.learning_work !== "number" || typeof record.leisure !== "number") {
    return fallback;
  }
  return { training: record.training, learning_work: record.learning_work, leisure: record.leisure };
}

function readGoals(prompt: string): BudgetGoal[] {
  const match = prompt.match(/GOALS_JSON:(\[[\s\S]*?\])/);
  if (!match?.[1]) {
    return [];
  }
  const parsed: unknown = JSON.parse(match[1]);
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }
    const goal = item as Partial<BudgetGoal>;
    if (!goal.id || !goal.category || typeof goal.urgency !== "number" || typeof goal.manualPriority !== "number") {
      return [];
    }
    return [{ id: goal.id, category: goal.category, urgency: goal.urgency, manualPriority: goal.manualPriority }];
  });
}
