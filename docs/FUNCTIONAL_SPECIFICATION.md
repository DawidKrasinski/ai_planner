# Functional Specification

## 1. Goals

### 1.1 Goal model

A goal is an independent planning unit. Goals do not have a required
parent/child hierarchy. Related goals may be understood by AI, but must
remain separate records.

Examples: - English --- vocabulary - English --- speaking - Advanced
mathematics - Programming - Gym - Climbing

Each goal should support: - Name and description. - Exactly one
category: Training, Learning / Work, or Leisure. - Manual priority from
1 to 6. - Current level or current progress. - Desired level, result, or
outcome. - Optional deadline. - Difficulty estimate from 1 to 10. -
Progress measurement method and current progress value. - AI-generated
planning notes and assumptions. - Active, paused, completed, or archived
status. - Created/updated timestamps and full change history.

AI may ask clarifying questions when important information is missing.
It may estimate fields such as difficulty, but estimates must be
identifiable as estimates and editable by the user.

### 1.2 Goal creation

The primary goal-creation flow is a natural-language conversation with
the AI assistant.

The assistant should: 1. Extract the goal name and intended outcome. 2.
Identify the category. 3. Ask only for information needed to plan
responsibly. 4. Suggest a priority, difficulty, and progress measurement
approach. 5. Identify relevant deadlines and current/desired levels. 6.
Present a concise summary for confirmation. 7. Create the goal only
after the user confirms its creation. 8. Recalculate the weekly budget
and schedule.

Manual creation and editing must also be available.

AI may suggest new goals, but must not create them without user
approval.

## 2. Categories and time boundaries

Each goal belongs to exactly one category: - Training - Learning /
Work - Leisure

Category time budgets and limits are configurable settings, not
hardcoded constants. Time should not move between categories
automatically except under the exceptional priority 5 and 6 rules.

The user's initial illustrative day estimates were not a consistent
24-hour allocation and must not be treated as fixed quotas. The system
must instead model the user's actual day, constraints, and configurable
category preferences.

## 3. Priority system

Manual priority values:

  Priority   Meaning                    Default additional-time allowance
  ---------- ------------------------ -----------------------------------
  1          Lowest                                             0 minutes
  2          Low                                         Up to 30 minutes
  3          Medium                                      Up to 60 minutes
  4          High                                       Up to 120 minutes
  5          Very high                                  Up to 240 minutes
  6          Exceptional / critical                       No standard cap

These allowances are configurable settings, not immutable rules.

### 3.1 Exceptional category borrowing

-   Priorities 1--4 should normally remain within their category's time
    allocation.
-   Priority 5 may use leisure time first and, if AI determines it is
    necessary, training time.
-   Priority 6 may use leisure time first, then training time, and only
    in an extreme case may affect sleep.
-   Sleep is otherwise protected and must not be reduced by ordinary
    scheduling decisions.
-   The system should record why exceptional time borrowing occurred.

AI should not use priority 5 or 6 as a routine shortcut. Priority 6 is
intended to be rare.

### 3.2 Deadlines

A deadline may increase a goal's effective urgency. The manually
assigned priority must remain unchanged in stored data. The system
should calculate a separate dynamic urgency score so that a lower manual
priority with an imminent deadline can temporarily outrank a
higher-priority goal.

The exact urgency formula is an implementation decision and must be
configurable and explainable.

## 4. Weekly planning and calendar

The default planning horizon is one week.

AI first estimates the required weekly time budget for every active
goal. The Scheduling Engine then places those hours into the calendar.

The scheduler may choose block lengths based on the goal, task type,
energy profile, and available time. There is no universal fixed block
length. Example block lengths may include 30, 90, or 180 minutes.

Short transitions between goals should be configurable; the initial
suggested default is approximately 10 minutes. Longer breaks should be
inserted after extended periods of work.

The schedule must account for: - Sleep and wake time. - Meals. - Fixed
commitments. - Routines. - Travel and commute time. - Preparation and
changing time for activities. - Short transitions between goals. -
Longer breaks and recovery. - Energy and concentration patterns. -
Category budgets and priority rules.

### 4.1 Preferred day pattern

The initial preferred pattern is: 1. Light morning training,
approximately one hour where appropriate. 2. Main learning/work block.
3. Heavier training after the main learning/work block. 4. Leisure /
personal time. 5. Sleep.

Meals and obligations should be placed at suitable times, e.g. breakfast
in the morning and lunch around the user's configured lunch period.

This is a configurable preference, not a rigid template. The AI should
learn and adapt to the user's actual rhythm.

### 4.2 Unused time and early completion

The preferred behavior is to consolidate unused time into personal time
toward the end of the day where feasible, allowing the user to finish
obligations earlier.

If a task finishes earlier than planned, the system may move subsequent
tasks earlier, provided transitions and constraints remain valid.

The scheduler may leave free windows when that is better than forcing
low-value work into the calendar.

## 5. Calendar item types

The system must distinguish four concepts.

### 5.1 Goal work sessions

Calendar blocks generated from a goal's weekly time budget. They
contribute to goal execution and statistics.

### 5.2 One-off tasks / events

User-created, non-recurring items that take precedence over the
generated plan. Examples include a medical appointment, meeting, or
parcel collection.

The implementation should support a fixed-time event and, where useful,
a flexible one-off task with a due window. Do not silently move a
fixed-time event.

### 5.3 Routines

Mandatory recurring activities with some flexibility in exact time, such
as morning and evening hygiene. The scheduler must place them within
their configured windows.

### 5.4 Fixed commitments

Recurring or one-time commitments with fixed, non-movable time slots,
such as school, work, or a team training session. These are hard
calendar constraints.

## 6. Execution tracking and two independent measurement systems

### 6.1 Time-use efficiency

After a work session, the user provides an efficiency rating from 1 to
10 describing how effectively the actual time was used.

Formula:

`Effective Time = Actual Time × (Efficiency Rating / 10)`

Example: 3 hours of work with an efficiency rating of 5 produces 1.5
effective hours.

This is not the percentage completion of the overall goal.

### 6.2 Goal progress

Goal progress is tracked separately. A simple shared baseline is a
manually reported percentage from 0% to 100%, while allowing
goal-specific measurement methods later.

The AI may ask for progress updates when useful. Automated tests or
quizzes are optional and must not be mandatory for all goals.

### 6.3 Plan completion ratio

For a session or defined reporting unit:

`Plan Completion (%) = (Actual Time × Efficiency / Planned Time) × 100`

Here efficiency is represented as a decimal between 0.1 and 1.0.

Example: planned 3 hours, actual 2 hours, efficiency 0.5 gives 33.3%.

The initial formula is confirmed. Whether the value is capped at 100% or
may exceed 100% should be a configurable/reporting decision.

### 6.4 Partial completion

A session or task may be partially completed. Store planned duration,
actual duration, efficiency, and completion status separately.

## 7. Difficulty and discipline statistics

Difficulty is estimated by AI once when a goal or task is created, on a
scale of 1--10. It remains editable by the user and AI.

Daily difficulty score:

`Daily Difficulty = Σ (Actual Hours × Efficiency × Difficulty)`

Example: 3 hours, efficiency 0.5, difficulty 7 = 10.5 difficulty points.

The discipline dashboard should include: - Plan completion percentage. -
Effective time. - Average efficiency. - Daily and weekly difficulty. -
Time spent on each individual goal, not only category totals. - Goal
progress history. - Best and worst days. - Difficulty records. -
Consistency streaks. - Week/month comparisons.

Period filters: - Today - Yesterday - Last 7 days - Last 30 days - Last
3 months - Last year - All time

The AI may provide factual and constructive motivation: identify
records, consistency, declining performance, or slow progress without
shaming the user.

## 8. Change handling and replanning

The user may add events or changes in natural language, for example: "I
have an extra basketball training session on Friday at 20:00."

The AI should: 1. Extract the event details. 2. Ask for missing
essential information. 3. Add the event after sufficient confirmation
where required. 4. Identify conflicts. 5. Rebuild the affected schedule,
usually the current week. 6. Move lower-priority work where necessary.
7. Preserve goal progress and historical execution data. 8. Explain the
most important changes.

Routine AI replanning does not require approval for every schedule
adjustment.

### 8.1 Missed work

The system should not immediately rebuild the plan every time a session
is missed. It should normally wait for the evening review, then assess
the week and goal progress.

It does not need to recover every missed minute. If progress is
sufficient, the AI may leave the schedule unchanged. If progress is
insufficient, it may reallocate time from lower-priority goals.

### 8.2 Overload handling

**Confirmed behavior:** AI independently assesses overload. Depending on
severity and context, it may automatically reduce lower-priority
workload or ask the user before making a decision.

The system should protect sleep and recovery, explain material
reductions, and record changes for undo.

### 8.3 Manual calendar edits

The user can drag and move calendar items. The AI may ask whether a
manual change is one-time or represents a longer-term preference. The
system should learn from the answer, not assume every drag is a
permanent preference.

## 9. Reviews and background operations

### 9.1 Evening review

The AI performs an evening review and may ask for missing information
about actual time, efficiency, completion, events, or goal progress.

The AI decides which questions are necessary; it should avoid
unnecessary questionnaires.

### 9.2 Weekly review

The AI analyzes: - Planned versus actual work. - Effective time and
efficiency. - Goal progress. - Priorities and deadlines. - Overload and
recovery. - Category allocation. - Missed or partially completed
sessions.

It then determines the next week's goal budgets and creates a new
schedule.

Background work must run even when the browser is closed.

## 10. History, memory, and reversibility

-   Retain user data and historical records indefinitely by default.
-   Preserve completed goals in history; allow archiving without losing
    records.
-   AI memory must store relevant preferences, goals, priorities,
    progress history, efficiency patterns, training preferences,
    schedule edits, and weekly-review conclusions.
-   The user must be able to inspect and edit AI memory.
-   AI-generated changes must be versioned and reversible.
-   The user must be able to view a change history and restore a prior
    plan version.
-   Restoring a plan must create a new audit event; it must not erase
    the intervening history.

## 11. AI assistant

A compact AI assistant panel should be available from every main
application screen. It is not a separate full-screen chat destination.

The assistant supports: - Natural-language goal creation and editing. -
Adding events and commitments. - Asking for schedule explanations. -
Reporting completion and progress. - Updating preferences. - Requesting
replanning. - Reviewing discipline and statistics. - Proposing new goals
(approval required before creation).
