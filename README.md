# AI Personal Manager --- Project Documentation

This repository contains the product, functional, AI, scheduling, data,
technical, API, UI/UX, security, acceptance, and implementation
specifications for the AI Personal Manager web application.

## Documentation index

  -----------------------------------------------------------------------------------------------------
  Document                                                          Purpose
  ----------------------------------------------------------------- -----------------------------------
  [PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md)                   Product vision, scope, principles,
                                                                    and confirmed decisions

  [FUNCTIONAL_SPECIFICATION.md](docs/FUNCTIONAL_SPECIFICATION.md)   User-facing features and business
                                                                    rules

  [AI_SYSTEM_SPECIFICATION.md](docs/AI_SYSTEM_SPECIFICATION.md)     AI responsibilities, memory,
                                                                    decision-making, and safeguards

  [SCHEDULING_ENGINE.md](docs/SCHEDULING_ENGINE.md)                 Budget allocation, calendar
                                                                    construction, validation, and
                                                                    replanning

  [DATA_ARCHITECTURE.md](docs/DATA_ARCHITECTURE.md)                 Domain model, entities,
                                                                    relationships, and retention

  [TECHNICAL_ARCHITECTURE.md](docs/TECHNICAL_ARCHITECTURE.md)       Recommended implementation
                                                                    architecture and technology stack

  [API_SPECIFICATION.md](docs/API_SPECIFICATION.md)                 Proposed API boundaries and
                                                                    endpoint contracts

  [UI_UX_SPECIFICATION.md](docs/UI_UX_SPECIFICATION.md)             Application navigation, screens,
                                                                    and interaction requirements

  [SECURITY_AND_PRIVACY.md](docs/SECURITY_AND_PRIVACY.md)           Authentication, data protection,
                                                                    secrets, and privacy

  [ACCEPTANCE_CRITERIA.md](docs/ACCEPTANCE_CRITERIA.md)             Testable definition of done

  [IMPLEMENTATION_ROADMAP.md](docs/IMPLEMENTATION_ROADMAP.md)       Suggested phased delivery plan
  -----------------------------------------------------------------------------------------------------

## Status conventions

-   **Confirmed**: explicitly selected or approved by the product owner.
-   **Recommended**: a proposed technical choice that should be reviewed
    before implementation.
-   **Open decision**: intentionally left for a later decision; do not
    silently treat it as confirmed.

## Product summary

The application is a single-user, responsive web application that acts
as an autonomous personal manager. It manages long-term goals, weekly
time budgets, calendar schedules, routines, fixed commitments, one-off
events, training, learning/work, leisure, progress, discipline
statistics, and an editable AI memory.

The AI makes planning decisions autonomously within explicit rules. A
separate deterministic Scheduling Engine validates and places schedule
blocks. The application must continue to function as a planner even when
external calendar synchronization is not configured.

## Confirmed baseline stack

-   Frontend: Next.js, React, TypeScript.
-   Backend: Next.js API / Route Handlers.
-   Database and authentication: Supabase with PostgreSQL.
-   Hosting: Vercel + Supabase.
-   AI: multi-provider architecture with provider abstraction; OpenAI,
    Anthropic, and other providers may be supported.
-   Scheduling: AI strategy layer plus an independent deterministic
    Scheduling Engine.
-   Initial audience: one user / one private account.
-   Client experience: responsive website for desktop and mobile; no PWA
    requirement in the initial scope.
-   UI language: Polish initially.
-   Calendar integration: Google Calendar is an optional integration;
    the app's own calendar must work without it.
-   Background work: yes, including evening analysis and weekly
    planning.
-   Cost approach: balanced quality and operating cost.

## Local development

Copy `.env.example` to `.env.local` and fill in the values. The app builds
without secrets, but sign-in needs Supabase Auth and planning needs
`DATABASE_URL`.

```bash
pnpm install
docker compose up -d postgres
pnpm db:migrate
pnpm dev
```

Create the single allowed user in the Supabase dashboard. Public signup is
not offered. Set `ALLOWED_EMAIL` to that address.

`AI_PROVIDER=mock` uses a deterministic local adapter and the UI labels it
as such. OpenAI and Anthropic are used only when their keys are present.
Google Calendar stays optional.

Evening and weekly jobs are `POST /api/jobs/evening-review` and
`POST /api/jobs/weekly-review`. Vercel Cron calls them with
`Authorization: Bearer $CRON_SECRET`. The schedules in `vercel.json` are
UTC; the job body uses the profile time zone.

Before production, enable point-in-time recovery on the hosted Supabase
project and keep `SUPABASE_SERVICE_ROLE_KEY` and `TOKEN_ENCRYPTION_KEY`
only on the server.

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Integration tests that need Postgres run when `DATABASE_URL` is set. The
current implementation status is in
[docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md).
