# Technical Architecture

## 1. Confirmed technology choices

  -----------------------------------------------------------------------
  Layer                               Confirmed choice
  ----------------------------------- -----------------------------------
  Web framework                       Next.js

  UI framework                        React

  Language                            TypeScript

  Backend                             Next.js API / Route Handlers

  Database                            Supabase PostgreSQL

  Access                              No application login. One local
                                      dataset.

  Hosting                             Vercel + Supabase

  AI                                  Provider-independent multi-model
                                      architecture

  Calendar integration                Optional Google Calendar

  Initial users                       One private user

  Client                              Responsive desktop/mobile website

  UI language                         Polish initially

  Background operations               Required

  Cost target                         Balanced quality and operating cost
  -----------------------------------------------------------------------

## 2. Recommended supporting stack

These are implementation recommendations and remain open for approval:

-   Styling: Tailwind CSS.
-   UI primitives: shadcn/ui and Radix UI.
-   Form validation: Zod.
-   Database access: Supabase JavaScript client for auth/data access;
    optionally Drizzle ORM for typed SQL-heavy domain operations. Avoid
    introducing two competing data-access patterns without a clear
    boundary.
-   AI orchestration: Vercel AI SDK or a small internal provider adapter
    interface. Keep domain logic provider-neutral.
-   Calendar UI: a calendar component with week/day views,
    drag-and-drop, and custom event rendering; evaluate FullCalendar or
    an equivalent library.
-   Background scheduling: Vercel Cron for triggering jobs, backed by
    durable database job records and idempotency. If job duration or
    reliability requirements exceed platform limits, move workers to a
    dedicated queue/worker service.
-   Testing: Vitest for unit tests, Playwright for end-to-end tests.
-   Observability: structured server logs and error monitoring; avoid
    logging secrets or unnecessary personal content.

## 3. High-level architecture

``` text
Browser (Next.js UI)
        |
        v
Next.js Server Components / Route Handlers
        |
        +---- Application services
        |         |
        |         +---- Goal & calendar domain services
        |         +---- AI orchestration / provider adapters
        |         +---- Scheduling Engine
        |         +---- Analytics & review services
        |         +---- Google Calendar adapter (optional)
        |
        v
Supabase PostgreSQL
        |
        +---- Goals, settings, calendar, sessions
        +---- Plan versions, audit log, AI memory
        +---- Background job records
```

## 4. Architectural boundaries

### 4.1 Presentation layer

Responsible for rendering screens, collecting user input, calendar
interactions, and displaying AI explanations. It must not contain
authoritative scheduling rules.

### 4.2 API / application layer

Responsible for input validation,
orchestration, transactions, and domain service calls.

### 4.3 AI orchestration layer

Responsible for provider selection, prompts, structured outputs,
retries, usage accounting, and safe conversion of model proposals into
typed domain commands.

### 4.4 Scheduling Engine

A deterministic TypeScript module with no dependency on a specific AI
provider or UI framework. It should be unit-testable independently.

### 4.5 Persistence layer

PostgreSQL is the source of truth. Use migrations, constraints, and
transactional writes for plan commits.

## 5. Background execution

Required jobs: - Evening review. - Weekly review and next-week plan
generation. - Optional periodic sync with Google Calendar. -
Retry/recovery of failed jobs.

Recommended approach: 1. Vercel Cron triggers a secured Route Handler.
2. The handler creates or claims a durable job record. 3. A
worker/service executes the job with an idempotency key. 4. Results are
persisted and audited. 5. Failures are recorded and retried according to
bounded retry policy.

Do not assume a serverless request can run indefinitely. Keep work
within platform execution limits or use a dedicated worker if needed.

## 6. AI provider abstraction

Define an internal interface around capabilities rather than exposing
provider SDKs to domain services.

Example conceptual contract:

``` ts
interface AIProvider {
  generateStructured<T>(request: StructuredAIRequest<T>): Promise<T>;
  generateText(request: TextAIRequest): Promise<string>;
}
```

The actual implementation should include: - Provider/model registry. -
Per-task routing configuration. - Typed schemas for structured
outputs. - Usage and cost metadata. - Timeouts, retries, and error
normalization. - Provider-specific adapters isolated in one module.

Do not allow model-generated output to directly mutate database records.

## 7. Optional Google Calendar integration

The internal calendar is authoritative for the planner's own generated
blocks. Google Calendar is an optional external integration.

The application must work without Google Calendar authorization.

Before enabling sync, define: - Import-only, export-only, or two-way
sync behavior. - Conflict resolution. - Event ownership and deletion
semantics. - Which events become hard constraints. - OAuth scopes and
token storage. - Duplicate detection and sync idempotency.

Recommended initial integration scope: import external events as fixed
commitments and optionally export generated blocks, with explicit sync
settings. This is a recommendation, not yet a confirmed sync policy.

## 8. Deployment environments

Maintain separate development, staging, and production environments
where practical: - Separate Supabase projects or isolated
environments. - Separate Vercel deployments and environment variables. -
Database migrations applied through a controlled pipeline. - No
production secrets in source control. - Preview deployments must not
receive production service-role secrets by default.

## 9. Open technical decisions

Resolve before or during implementation: - Exact Next.js version and
deployment runtime. - Tailwind/shadcn adoption. - ORM/data-access
convention. - Calendar component selection. - AI SDK/orchestration
library. - Background worker strategy and expected job duration. -
Google Calendar sync direction and conflict policy. - Backup and
point-in-time recovery plan. - Whether future multi-user support is
explicitly prohibited or merely out of initial scope.
