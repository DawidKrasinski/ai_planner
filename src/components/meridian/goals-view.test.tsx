// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GoalsView } from "./goals-view";
import { ShellProvider } from "./shell-context";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function wrap(ui: React.ReactNode) {
  return (
    <ShellProvider
      value={{
        openAI: () => undefined,
        openAdd: () => undefined,
        profileName: "Dawid",
        profileInitials: "D",
      }}
    >
      {ui}
    </ShellProvider>
  );
}

describe("GoalsView", () => {
  it("shows loading and error states", () => {
    const { rerender } = render(wrap(<GoalsView state={{ status: "loading" }} />));
    expect(screen.getByRole("status")).toHaveTextContent("Wczytywanie celów");
    rerender(wrap(<GoalsView state={{ status: "error", message: "Błąd celów" }} />));
    expect(screen.getByRole("alert")).toHaveTextContent("Błąd celów");
  });

  it("filters goals by category", async () => {
    const user = userEvent.setup();
    render(
      wrap(
        <GoalsView
          state={{
            status: "success",
            data: {
              goals: [
                {
                  id: "1",
                  name: "Angielski",
                  category: "learning_work",
                  status: "active",
                  manualPriority: 1,
                  progressValue: 40,
                  currentLevel: "B2",
                  desiredLevel: "C1",
                  difficulty: 7,
                  weeklyMinutes: 360,
                },
                {
                  id: "2",
                  name: "Siłownia",
                  category: "training",
                  status: "active",
                  manualPriority: 2,
                  progressValue: 20,
                  currentLevel: null,
                  desiredLevel: null,
                  difficulty: 5,
                  weeklyMinutes: 240,
                },
              ],
            },
          }}
        />,
      ),
    );
    expect(screen.getAllByText("Angielski").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "Trening" }));
    expect(screen.queryByText("Angielski")).not.toBeInTheDocument();
    expect(screen.getAllByText("Siłownia").length).toBeGreaterThan(0);
  });
});
