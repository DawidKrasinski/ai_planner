// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardView, type DashboardData } from "./dashboard-view";
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

const sample: DashboardData = {
  greetingName: "Dawid",
  todayLabel: "Piątek, 13 listopada",
  aiSummary: "Plan tygodnia jest aktywny.",
  sessions: [],
  goals: [],
  metrics: {
    plannedLabel: "0m",
    plannedNote: "0 sesji",
    effectiveLabel: "0m",
    effectiveNote: "brak danych",
    completionLabel: "0%",
    completionNote: "0 z 0",
    completionPercent: 0,
    efficiencyLabel: "—",
    efficiencyNote: "brak ocen",
  },
  weekBars: [0, 0, 0, 0, 0, 0, 0],
  weekLabel: "0m z 0m",
  weekPercent: 0,
};

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

describe("DashboardView", () => {
  it("shows loading state", () => {
    render(wrap(<DashboardView state={{ status: "loading" }} />));
    expect(screen.getByRole("status")).toHaveTextContent("Wczytywanie pulpitu");
  });

  it("shows error with retry", () => {
    render(wrap(<DashboardView state={{ status: "error", message: "Błąd pulpitu" }} />));
    expect(screen.getByRole("alert")).toHaveTextContent("Błąd pulpitu");
  });

  it("shows empty day and goals", () => {
    render(wrap(<DashboardView state={{ status: "success", data: sample }} />));
    expect(screen.getByText("Na dziś nie zaplanowano żadnych bloków.")).toBeInTheDocument();
    expect(screen.getByText("Brak aktywnych celów.")).toBeInTheDocument();
    expect(screen.getByText("Plan tygodnia jest aktywny.")).toBeInTheDocument();
  });
});
