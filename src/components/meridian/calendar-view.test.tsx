// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CalendarView } from "./calendar-view";
import { ShellProvider } from "./shell-context";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined }),
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

describe("CalendarView", () => {
  it("renders loading, error, and empty week", () => {
    const { rerender } = render(wrap(<CalendarView state={{ status: "loading" }} />));
    expect(screen.getByRole("status")).toHaveTextContent("Wczytywanie kalendarza");
    rerender(wrap(<CalendarView state={{ status: "error", message: "Błąd kalendarza" }} />));
    expect(screen.getByRole("alert")).toHaveTextContent("Błąd kalendarza");
    rerender(
      wrap(
        <CalendarView
          state={{
            status: "success",
            data: {
              timezone: "Europe/Warsaw",
              weekStart: "2025-05-12",
              today: "2025-05-14",
              events: [],
              unscheduled: [],
              notice: null,
              dayStartHour: 7,
              dayEndHour: 14,
              categoryBudgets: { training: 240, learning_work: 720, leisure: 300 },
            },
          }}
        />,
      ),
    );
    expect(screen.getByText("Ten tydzień nie ma jeszcze bloków.")).toBeInTheDocument();
  });
});
