// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import { GoalForm } from "./goal-form";
import messages from "../../messages/pl.json";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined }),
}));

describe("goal form", () => {
  it("shows a validation message when the request fails", async () => {
    const user = userEvent.setup();
    render(
      <NextIntlClientProvider locale="pl" messages={messages}>
        <GoalForm />
      </NextIntlClientProvider>,
    );
    await user.type(screen.getByLabelText("Nazwa"), "Angielski");
    global.fetch = (async () => new Response(JSON.stringify({ error: { message: "no" } }), { status: 400 })) as typeof fetch;
    await user.click(screen.getByRole("button", { name: "Zapisz cel" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Priorytet");
  });
});
