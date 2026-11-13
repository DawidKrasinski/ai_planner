// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EmptyState, ErrorState, LoadingState } from "./states";

describe("meridian states", () => {
  it("renders loading status", () => {
    render(<LoadingState label="Ładowanie pulpitu…" />);
    expect(screen.getByRole("status")).toHaveTextContent("Ładowanie pulpitu…");
  });

  it("renders error with retry", async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(<ErrorState message="Błąd sieci" onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Błąd sieci");
    await user.click(screen.getByRole("button", { name: "Spróbuj ponownie" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("renders empty copy", () => {
    render(<EmptyState>Brak danych.</EmptyState>);
    expect(screen.getByText("Brak danych.")).toBeInTheDocument();
  });
});
