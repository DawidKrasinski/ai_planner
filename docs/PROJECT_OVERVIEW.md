# Project Overview

## 1. Product vision

AI Personal Manager is a web-based personal operating system for
managing time, development, learning, work, training, leisure, and
long-term goals.

It is not merely a calendar or task list. Its central capability is to
evaluate competing goals, determine the time investment each goal needs,
create a practical weekly schedule, monitor execution and progress, and
adapt the plan as circumstances change.

The system should behave like an autonomous personal manager while
keeping the user in control of goals, settings, data, and reversibility.

## 2. Product objectives

1.  Convert a user's long-term goals into realistic weekly time budgets
    and calendar blocks.
2.  Balance multiple goals with different priorities, deadlines,
    difficulty levels, and progress rates.
3.  Respect fixed commitments, routines, sleep, meals, travel,
    preparation, and recovery.
4.  Replan when new events occur, sessions finish early, work is missed,
    or progress changes.
5.  Distinguish time-use efficiency from overall goal progress.
6.  Learn the user's rhythm and preferences over time.
7.  Provide meaningful discipline and progress analytics.
8.  Preserve a complete, reviewable history and allow AI changes to be
    undone.

## 3. Target user and product form

**Confirmed:** The initial application is for one user and one private
account. It is not initially a multi-user SaaS product.

**Confirmed:** The product is a responsive website accessible from
desktop and mobile browsers. A Progressive Web App is not required for
the initial release.

**Confirmed:** The initial UI language is Polish. The implementation
should avoid hardcoding user-facing strings so additional languages can
be added later.

## 4. Core domain categories

Every goal belongs to exactly one category:

-   **Training**
-   **Learning / Work**
-   **Leisure**

The system must not automatically transfer time between categories as if
all time were interchangeable. Special rules apply to priorities 5 and
6, described in the functional and scheduling specifications.

## 5. Core planning model

The planning process has two distinct stages:

1.  **Strategic allocation:** AI evaluates goals and determines a
    proposed weekly time budget for each goal.
2.  **Calendar construction:** the Scheduling Engine places the required
    work into available time slots while respecting hard constraints and
    validating the result.

AI is responsible for contextual decisions. The Scheduling Engine is
responsible for deterministic feasibility, conflict detection, and
schedule validation.

## 6. Confirmed technical baseline

  Area                    Decision
  ----------------------- ---------------------------------------------------------------
  Frontend                Next.js + React + TypeScript
  Backend                 Next.js API / Route Handlers
  Database                Supabase / PostgreSQL
  Hosting                 Vercel + Supabase
  AI                      Multi-provider architecture, provider-independent abstraction
  Scheduling              AI decision layer + independent deterministic engine
  Users                   One private user initially
  UI language             Polish initially
  Calendar integration    Optional Google Calendar
  Background processing   Required
  Responsive behavior     Desktop and mobile web
  Cost strategy           Balanced quality and cost

See `TECHNICAL_ARCHITECTURE.md` for recommended supporting libraries and
deployment details. Supporting libraries are recommendations, not all
confirmed product-owner decisions.

## 7. Product principles

-   **Autonomy with boundaries:** AI may make routine planning decisions
    without asking for approval each time, but must obey explicit
    constraints.
-   **User reversibility:** AI-generated changes must be inspectable and
    reversible.
-   **Explainability:** significant schedule changes should have concise
    explanations.
-   **Data ownership:** the user can inspect and edit goals, settings,
    history, and AI memory.
-   **No silent data loss:** history is retained indefinitely unless the
    user explicitly requests deletion.
-   **Graceful degradation:** the planner remains useful when Google
    Calendar or an AI provider is unavailable.
-   **Separation of concerns:** AI reasoning must not replace
    deterministic schedule validation.
-   **No fabricated certainty:** estimated progress, effort, or
    difficulty must be labeled as an estimate.

## 8. Out of scope for the initial release

Unless later approved, do not assume the initial release includes: -
Native iOS or Android applications. - Multi-user organizations, teams,
or shared calendars. - Mandatory Google Calendar connectivity. -
Automatic creation of new goals without user approval. - Mandatory
automated tests or quizzes to measure every goal's progress. - Push
notifications or SMS notifications.
