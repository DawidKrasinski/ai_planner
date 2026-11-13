# Implementation status

Last updated: 2026-11-13.

## Decisions recorded during implementation

- Domain data uses Drizzle and `postgres`. `@supabase/ssr` is used only for auth cookies. SQL lives in `supabase/migrations/0001_init.sql`.
- The calendar is a purpose-built week view. Items can be moved with the edit form. Drag-and-drop is an additional path and records a one-time change.
- Scheduling is a pure module in `src/domain/scheduling`. AI output is a budget proposal. The engine places blocks.
- Metrics follow `docs/FUNCTIONAL_SPECIFICATION.md`. Effective time, plan completion, and daily difficulty stay separate. Urgency does not overwrite manual priority. The default deadline boost is 250 so an imminent priority-2 goal can outrank a distant priority-4 goal.
- `AI_PROVIDER=mock` is a labeled local adapter. A selected real provider without a key throws `AI_PROVIDER_UNAVAILABLE` and does not replace the current plan.
- Restoring a plan writes a new version after the engine runs again. Intervening history stays.
- Google export is off until the settings checkbox is saved. Connect then requests the events scope and the callback stores that choice.

## What is in place

- Next.js App Router, TypeScript, Tailwind, Zod environment parsing, Polish copy catalog, auth proxy, and the mobile shell.
- Schema, row-level security, goal and calendar services, and the manual week planner.
- Deterministic engine coverage for overlap, fixed events, category borrowing, priority 5 and 6, sleep, routines, buffers, daylight saving, capacity shortage, locks, and identical inputs.
- Assistant replies are validated before display. A goal is inserted only after the confirmation action calls `POST /api/goals`.
- Weekly plans, replanning around a manual change, early-completion pull-forward, and versioned commits.
- Session start, complete, skip, dashboard, and statistics from stored rows.
- Evening and weekly jobs, memory edit and delete, overload reduction of priority 1–2 budgets, and plan restore.
- Google OAuth state cookie, encrypted refresh tokens, import as fixed events, and optional export.
- Account export and confirmed deletion of the profile row.

## Verification on 2026-11-13

- Unit tests: `pnpm test`.
- Postgres checks with `DATABASE_URL` set: another user's goals are hidden from the `authenticated` role, and a system week plan persists goal sessions.
- `pnpm typecheck`, `pnpm lint`, and `pnpm build` succeeded after the private layout was forced dynamic and the Tailwind Turbopack loader was restored.
- Browser check: `/dashboard` redirects to `/login`. Without Supabase variables the login button stays disabled and the page says authentication is not configured. At 390px the login page does not scroll sideways. `GET /api/goals` and an unsigned cron call return 401.
- Playwright `e2e/auth.spec.ts`: 4 passed, mobile and desktop. The suite checks the Polish login page, the redirect from `/dashboard`, and the disabled button when Supabase is not configured. Signed-in journeys were not run because this environment has no Supabase project.

## Limitations

- Local Docker provides PostgreSQL only. Email sign-in needs a hosted or local Supabase Auth project and `ALLOWED_EMAIL`.
- The table owner connection used by the app bypasses row-level security. Services filter by the session user id. The `authenticated` policy was executed in the integration test.
- The weekly review builds the next week with the system allocator, then applies overload reductions. It does not call a live model.
- Evening review refuses to invent execution data. Open sessions leave the job retryable.
- Google sync was not executed against a Google account.
- Point-in-time recovery must be enabled on the hosted Supabase project before production use. The application cannot turn that on.
