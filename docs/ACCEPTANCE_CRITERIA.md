# Acceptance Criteria

This document defines observable conditions that must be satisfied
before the corresponding functionality is considered complete.

## 1. Account and privacy

-   [ ] The private application requires authentication.
-   [ ] Unauthenticated users cannot access private pages or API data.
-   [ ] RLS prevents access to another user's records, even though the
    initial product is single-user.
-   [ ] Service-role credentials are never exposed to the browser.

## 2. Goals

-   [ ] A user can create a goal through a natural-language assistant
    flow.
-   [ ] The assistant can ask clarifying questions before proposing a
    goal.
-   [ ] A goal is not persisted until the user confirms creation.
-   [ ] Every goal has exactly one of the three supported categories.
-   [ ] Manual priority is constrained to 1--6.
-   [ ] Difficulty is constrained to 1--10.
-   [ ] Goals can be edited, paused, completed, and archived.
-   [ ] Completed and archived goals remain available in history.
-   [ ] AI may propose new goals but cannot create them without
    approval.

## 3. Planning and calendar

-   [ ] The system creates a weekly time budget for active goals.
-   [ ] The Scheduling Engine creates a calendar plan from those
    budgets.
-   [ ] Fixed commitments and fixed one-off events are never moved by
    automatic replanning.
-   [ ] Routines are placed within their configured windows.
-   [ ] The schedule contains no overlapping blocks.
-   [ ] Travel, preparation, transitions, and breaks can be represented.
-   [ ] Category rules and priority 5/6 borrowing order are enforced.
-   [ ] Sleep is protected under priorities 1--5.
-   [ ] Insufficient capacity is reported instead of hidden.
-   [ ] A user can manually move calendar items.
-   [ ] Early completion can move later work earlier without violating
    constraints.

## 4. Execution metrics

-   [ ] Actual duration is stored separately from planned duration.
-   [ ] Efficiency rating is recorded on a 1--10 scale.
-   [ ] Effective time is calculated as actual time multiplied by
    efficiency divided by 10.
-   [ ] Goal progress is stored independently from efficiency.
-   [ ] Plan completion uses the confirmed formula.
-   [ ] Partial completion is supported.
-   [ ] Difficulty snapshots preserve historical calculations.

## 5. Discipline dashboard

-   [ ] The user can select all required reporting periods.
-   [ ] Time is shown for individual goals, not only categories.
-   [ ] Effective time, efficiency, plan completion, and difficulty are
    distinguishable.
-   [ ] Goal progress history is available.
-   [ ] Historical comparisons are based on stored records.

## 6. AI and reviews

-   [ ] AI provider adapters share a provider-neutral interface.
-   [ ] Invalid structured model output is rejected.
-   [ ] AI cannot execute raw database commands.
-   [ ] Evening review can run when the browser is closed.
-   [ ] Weekly review can generate the next week's budgets and schedule.
-   [ ] Overload logic can reduce lower-priority workload or ask the
    user, depending on impact.
-   [ ] Significant AI changes include a concise explanation.
-   [ ] AI memory can be viewed and edited by the user.

## 7. History and undo

-   [ ] Every committed plan has a version.
-   [ ] Consequential AI and user changes are recorded.
-   [ ] A prior plan can be restored as a new version.
-   [ ] Restoring a plan does not erase intervening history.
-   [ ] The restored plan is revalidated against current hard
    constraints.

## 8. Integrations and resilience

-   [ ] The application works without Google Calendar connected.
-   [ ] Google Calendar connection is optional.
-   [ ] Sync failures do not corrupt the internal calendar.
-   [ ] AI provider outages do not destroy or invalidate the current
    plan.
-   [ ] Background jobs are idempotent and can recover from transient
    failures.

## 9. User experience

-   [ ] The application works on desktop and mobile browser sizes.
-   [ ] Main navigation contains Dashboard, Calendar, Goals,
    Discipline/Statistics, and Settings.
-   [ ] The AI assistant is accessible from each main screen.
-   [ ] The initial interface is in Polish.
-   [ ] Calendar events can be edited without relying exclusively on
    drag-and-drop.
-   [ ] Important schedule changes are visible in the application.
