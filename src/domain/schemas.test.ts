import { describe, expect, it } from "vitest";
import { AssistantOutputSchema, CreateGoalSchema, SettingsSchema } from "./schemas";
import { defaultSettings } from "./defaults";

describe("goal schema", () => {
  it("rejects priority outside 1-6 and unknown fields", () => {
    const result = CreateGoalSchema.safeParse({
      name: "Angielski",
      category: "learning_work",
      manualPriority: 7,
      difficulty: 4,
      extra: true,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a confirmed manual goal", () => {
    const result = CreateGoalSchema.safeParse({
      name: "Siłownia",
      category: "training",
      manualPriority: 3,
      difficulty: 6,
      description: "Trening ogólnorozwojowy",
    });
    expect(result.success).toBe(true);
  });
});

describe("assistant output", () => {
  it("rejects malformed model output", () => {
    expect(AssistantOutputSchema.safeParse({ reply: "", proposal: { type: "goal_draft" } }).success).toBe(false);
  });

  it("accepts a goal draft that still requires confirmation", () => {
    const parsed = AssistantOutputSchema.parse({
      reply: "Proponuję cel do potwierdzenia.",
      proposal: {
        type: "goal_draft",
        draft: {
          name: "Angielski — słownictwo",
          description: "Codzienne słownictwo",
          category: "learning_work",
          manualPriority: 3,
          difficulty: 5,
          difficultyIsEstimate: true,
          progressMethod: "percent",
          currentLevel: "A2",
          desiredLevel: "B2",
          deadlineAt: null,
          planningNotes: "Szacunek trudności.",
          questions: [],
        },
      },
    });
    expect(parsed.proposal?.type).toBe("goal_draft");
  });
});

describe("settings schema", () => {
  it("accepts the editable defaults", () => {
    expect(SettingsSchema.safeParse(defaultSettings).success).toBe(true);
  });
});
