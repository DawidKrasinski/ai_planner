# UI/UX Specification

## 1. Product experience

The shipped UI follows the Meridian visual design (DM Sans, custom
component CSS with Tailwind available). The application is a responsive
web dashboard with a persistent side navigation on desktop and an
appropriate compact navigation pattern on mobile.

The AI assistant is a small contextual panel available from every main
screen, not a separate full-screen chat as the primary experience.

Initial interface language: Polish. Keep text externalized for future
localization.

## 2. Main navigation

Required sections: 1. Dashboard 2. Calendar 3. Goals 4. Discipline /
Statistics 5. Settings

The AI assistant should be accessible from all sections.

## 3. Dashboard

The dashboard should provide a useful daily overview: - Today's
schedule. - Next upcoming activity. - Progress toward today's plan. -
Key goal status and deadlines. - Important AI-generated notices or
schedule changes. - A compact discipline summary. - Quick access to
report completion or add an event.

Avoid overloading the dashboard with every metric.

## 4. Calendar

The calendar is a central screen.

Required capabilities: - Weekly view as the primary view. - Day view or
focused day details. - Clear visual distinction between goal sessions,
fixed commitments, routines, and one-off events. - Drag-and-drop
rescheduling. - Manual creation and editing of events. - Display of
transitions, breaks, travel, and preparation where useful. - Conflict
visibility. - A clear indication of AI-generated or AI-adjusted
blocks. - A way to inspect why a block was placed at a particular time.

The initial desired layout includes a task list on one side and the
weekly schedule on the other. The exact responsive layout may be refined
during design.

## 5. Goal list and details

The goals screen should support: - Filtering by category and status. -
Sorting by priority, deadline, progress, or name. - Creating goals
through AI conversation or a manual form. - Editing all goal fields. -
Pausing, completing, and archiving goals. - Viewing individual goal
progress and time investment.

Clicking a goal opens details including: - Planned time. - Actual
time. - Effective time. - Efficiency history. - Difficulty. - Manual
priority and deadline urgency. - Progress history. - Related sessions
and notes. - AI planning rationale.

## 6. Discipline / statistics

Provide period selection: - Today - Yesterday - Last 7 days - Last 30
days - Last 3 months - Last year - All time

Display: - Plan completion. - Effective time. - Average efficiency. -
Daily/weekly difficulty. - Time per individual goal. - Goal progress
over time. - Consistency and streaks. - Best/worst days and records. -
Comparisons across weeks and months.

All charts should have understandable labels and should not imply that
efficiency equals goal progress.

## 7. Settings

Settings should expose editable planning parameters, including: - Wake
and sleep preferences. - Preferred day structure. - Category budgets and
limits. - Priority additional-time limits. - Transition duration. -
Break preferences. - Meal times. - Training preferences. - Energy and
concentration profile. - Timezone and language. - Google Calendar
connection and sync preferences. - AI provider/model configuration where
appropriate. - AI memory management. - Data export/deletion controls.

AI may propose changes to settings, but changes to explicit hard
constraints should require user approval.

## 8. AI assistant panel

The assistant should support contextual actions: - Add or edit a goal. -
Add an event. - Explain a schedule change. - Report session
completion. - Update goal progress. - Ask for a replan. - Review
statistics. - Propose a new goal.

The assistant should show confirmation summaries for actions that create
goals or connect external services.

## 9. Change history and undo

Provide a history view or contextual history panel showing: - Date and
time. - Actor (user, AI, system). - What changed. - Reason. - Affected
goals or calendar items. - Undo/restore action where safe.

Undo should create a new change record rather than erasing history.

## 10. Responsive behavior

Desktop: - Side navigation. - Rich weekly calendar. - Assistant panel
available without losing current context.

Mobile: - Compact navigation. - Readable day-focused calendar. -
Touch-friendly controls. - Goal and session details in stacked
layouts. - Drag-and-drop must not be the only way to move an event;
provide an accessible edit action.

## 11. Accessibility and usability

-   Keyboard-accessible navigation and controls.
-   Sufficient contrast.
-   Clear focus states.
-   Labels for form controls.
-   Avoid color-only status indicators.
-   Confirm destructive actions.
-   Make schedule conflicts understandable in plain language.
-   Use concise explanations and avoid unnecessary modal dialogs.
