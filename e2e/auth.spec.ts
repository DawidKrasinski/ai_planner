import { expect, test } from "@playwright/test";

test("login page is Polish and private pages redirect", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Menedżer osobisty" })).toBeVisible();
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("login form reports a missing password or an unconfigured account", async ({ page }) => {
  await page.goto("/login");
  const alert = page.getByRole("alert");
  const text = (await alert.textContent()) ?? "";
  if (text.includes("nie jest skonfigurowane")) {
    await expect(page.getByRole("button", { name: "Zaloguj" })).toBeDisabled();
    return;
  }
  await page.getByLabel("Adres e-mail").fill("person@example.com");
  await page.getByRole("button", { name: "Zaloguj" }).click();
  await expect(alert).toContainText("hasło");
});
