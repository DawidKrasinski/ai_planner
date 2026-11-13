# Implementation status

Last updated: 2026-11-13.

## Decisions recorded during implementation

- The frontend uses the Meridian UI design on Next.js App Router. Visual CSS/classes follow that design; logic talks to existing `/api/*` services. History is available from Settings (not a sixth primary nav item).
- Domain data uses Drizzle and `postgres`. There is no application login. SQL lives in `supabase/migrations`.
- The calendar is a purpose-built week view. Items can be moved with the edit form. Drag-and-drop is an additional path and records a one-time change.
- Scheduling is a pure module in `src/domain/scheduling`. AI output is a budget proposal. The engine places blocks.
- Metrics follow `docs/FUNCTIONAL_SPECIFICATION.md`. Effective time, plan completion, and daily difficulty stay separate. Urgency does not overwrite manual priority. The default deadline boost is 250 so an imminent priority-2 goal can outrank a distant priority-4 goal.
- `AI_PROVIDER=mock` is a labeled local adapter. A selected real provider without a key throws `AI_PROVIDER_UNAVAILABLE` and does not replace the current plan.
- Restoring a plan writes a new version after the engine runs again. Intervening history stays.
- Google export is off until the settings checkbox is saved. Connect then requests the events scope and the callback stores that choice.

## What is in place

- Next.js App Router, TypeScript, Tailwind, Zod environment parsing, Polish copy catalog, and the Meridian shell (sidebar, mobile header, bottom nav, AI panel, add modal).
- Client `clientApi` helper with Zod response checks and explicit loading/error/empty UI states on async Meridian views.
- Single-owner schema, goal and calendar services, and the manual week planner.
- Deterministic engine coverage for overlap, fixed events, category borrowing, priority 5 and 6, sleep, routines, buffers, daylight saving, capacity shortage, locks, and identical inputs.
- Assistant replies are validated before display. A goal is inserted only after the confirmation action calls `POST /api/goals`.
- Weekly plans, replanning around a manual change, early-completion pull-forward, and versioned commits.
- Session start, complete, skip, dashboard, and statistics from stored rows.
- Evening and weekly jobs, memory edit and delete, overload reduction of priority 1–2 budgets, and plan restore.
- Google OAuth state cookie, encrypted refresh tokens, import as fixed events, and optional export.
- Account export and confirmed deletion of the profile row.

## Verification on 2026-11-13

- Unit tests: `pnpm test` (includes Meridian states, clientApi, calendar layout, dashboard/goals/calendar/assistant panel tests).
- Postgres checks with `DATABASE_URL` set: goals have no `user_id`, and a system week plan persists goal sessions.
- `pnpm typecheck`, `pnpm lint`, and `pnpm build` after the Meridian frontend swap.
- Browser check after removing login is recorded with the change that dropped authentication.
- Playwright `e2e/auth.spec.ts` checks that `/dashboard` opens without login and that the five primary nav screens are reachable.

## Limitations

- Local Docker provides PostgreSQL only. Anyone who can open the deployment can use the planner.
- The table owner connection is the only database role the app uses.
- The weekly review builds the next week with the system allocator, then applies overload reductions. It does not call a live model.
- Evening review refuses to invent execution data. Open sessions leave the job retryable.
- Google sync was not executed against a Google account.
- Point-in-time recovery must be enabled on the hosted Supabase project before production use. The application cannot turn that on.
