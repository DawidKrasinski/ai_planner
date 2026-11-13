// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, afterEach } from "vitest";
import { AssistantPanel } from "./assistant-panel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined }),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AssistantPanel", () => {
  it("shows error when send fails", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ error: { message: "Asystent niedostępny" } }), { status: 503 })),
    );

    render(<AssistantPanel screen="dashboard" onClose={() => undefined} />);
    await user.type(screen.getByPlaceholderText("Napisz, co chcesz zrobić..."), "Dodaj cel");
    await user.click(screen.getByLabelText("Wyślij"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Asystent niedostępny");
  });

  it("creates a goal only after confirmation", async () => {
    const user = userEvent.setup();
    const draft = {
      name: "Nowy cel",
      description: "Opis",
      category: "learning_work",
      manualPriority: 2,
      difficulty: 5,
      difficultyIsEstimate: true,
      progressMethod: "percent",
      currentLevel: null,
      desiredLevel: null,
      deadlineAt: null,
      planningNotes: "",
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              reply: "Propozycja celu",
              proposal: { type: "goal_draft", draft },
              mock: true,
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: "g1" } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<AssistantPanel screen="goals" onClose={() => undefined} />);
    await user.type(screen.getByPlaceholderText("Napisz, co chcesz zrobić..."), "Chcę cel");
    await user.click(screen.getByLabelText("Wyślij"));
    expect(await screen.findByText("Nowy cel")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Utwórz cel" }));
    expect(await screen.findByText("Cel został zapisany.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/goals",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
