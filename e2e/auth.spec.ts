import { expect, test } from "@playwright/test";

test("the app opens the dashboard without a login page", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("navigation", { name: "Główna nawigacja" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const login = await page.request.get("/login");
  expect(login.status()).toBe(404);
});

test("main navigation reaches the five primary screens", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByRole("navigation", { name: "Główna nawigacja" }).getByRole("link", { name: "Kalendarz" }).click();
  await expect(page).toHaveURL(/\/calendar/);
  await page.getByRole("navigation", { name: "Główna nawigacja" }).getByRole("link", { name: "Cele" }).click();
  await expect(page).toHaveURL(/\/goals/);
  await page.getByRole("navigation", { name: "Główna nawigacja" }).getByRole("link", { name: "Dyscyplina i statystyki" }).click();
  await expect(page).toHaveURL(/\/statistics/);
  await page.getByRole("navigation", { name: "Główna nawigacja" }).getByRole("link", { name: "Ustawienia" }).click();
  await expect(page).toHaveURL(/\/settings/);
});
