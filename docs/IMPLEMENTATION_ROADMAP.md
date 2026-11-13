# Implementation Roadmap

## Guiding approach

Build the product in independently testable layers. Do not begin by
implementing an autonomous AI agent that can directly mutate the entire
application. First establish reliable domain models, calendar
constraints, and reversible changes.

## Phase 0 --- Technical foundation

Deliver: - Next.js + React + TypeScript project. - Supabase project and
schema migration workflow. - Supabase Auth for the private account. -
RLS policies and security tests. - Environment configuration for local,
preview, and production. - Basic responsive application shell. - Error
handling and structured logging.

Exit criteria: - A private user can sign in. - Private data is protected
by RLS. - Development and production environments are separated.

## Phase 1 --- Core domain and manual planner

Deliver: - User profile and settings. - Goal CRUD. - Calendar item
types. - Routines and fixed commitments. - Weekly calendar UI. - Manual
event creation and movement. - Plan version and change-history
foundations.

Exit criteria: - The user can manage goals and manually build a valid
weekly calendar. - Fixed events and routines are represented
correctly. - Changes are recorded.

## Phase 2 --- Deterministic Scheduling Engine

Deliver: - Constraint model. - Availability calculation. - Fixed-event
reservation. - Routine placement. - Goal-session placement. - Break,
transition, travel, and preparation support. - Category budget
enforcement. - Priority and deadline urgency interface. - Feasibility
diagnostics and automated tests.

Exit criteria: - Engine creates valid schedules for representative
scenarios. - Hard constraints are never violated. - Insufficient
capacity is reported clearly.

## Phase 3 --- AI assistant and provider abstraction

Deliver: - Provider-neutral AI interface. - At least one provider
adapter. - Structured output validation. - Conversational goal creation
draft and confirmation. - Event extraction and schedule explanation. -
AI-assisted goal estimation.

Exit criteria: - AI can propose typed domain changes. - No unconfirmed
goal is created. - AI output cannot bypass validation or scheduling
constraints.

## Phase 4 --- Strategic weekly planning

Deliver: - Weekly goal budget recommendations. - Deadline-aware
urgency. - Category and priority borrowing policy. - AI-to-scheduler
orchestration. - Plan explanations and versioned commits.

Exit criteria: - AI proposes budgets and the engine produces a feasible
schedule. - The user can inspect why allocations were made. - Previous
plans remain restorable.

## Phase 5 --- Execution tracking and analytics

Deliver: - Session completion flow. - Actual duration and efficiency
rating. - Effective-time calculations. - Separate goal progress
entries. - Difficulty scoring. - Discipline dashboard and period
filters.

Exit criteria: - All metrics are computed from persisted source
records. - Efficiency is never confused with goal progress.

## Phase 6 --- Background reviews and memory

Deliver: - Evening review jobs. - Weekly review jobs. - Durable job
tracking and idempotency. - AI memory extraction and confidence. -
Memory viewer/editor. - Overload assessment and adaptive workload
reduction.

Exit criteria: - Reviews run when the browser is closed. - Failed jobs
can be retried safely. - The user can correct or delete memory
entries. - Overload changes are explained and reversible.

## Phase 7 --- Google Calendar integration

Deliver: - OAuth connection flow. - Optional event import/export. -
Duplicate detection. - Sync status and error handling. - Explicit
conflict and ownership policy.

Exit criteria: - Core application remains fully functional without
Google Calendar. - Sync does not silently overwrite internal data.

## Phase 8 --- Hardening and release

Deliver: - End-to-end test suite. - Security review. - Backup and
restore test. - Performance and cost monitoring. - Accessibility
review. - Production deployment and operational documentation.

Exit criteria: - Acceptance criteria are satisfied. - Recovery
procedures are tested. - AI and background-job failure modes are safe.

## Suggested implementation order

Prioritize correctness and reversibility over agent autonomy. A reliable
manual planner plus a deterministic scheduling engine is the foundation
on which autonomous AI behavior should be added.
