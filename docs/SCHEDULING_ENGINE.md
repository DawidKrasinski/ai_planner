# Scheduling Engine Specification

## 1. Purpose

The Scheduling Engine converts strategic weekly time budgets into a
feasible calendar.

It must be deterministic for a given input and configuration, explain
validation failures, and never silently violate hard constraints.

## 2. Separation from AI

AI determines strategic intent and proposes budgets or adjustments. The
Scheduling Engine: - Calculates available time. - Reserves fixed
commitments. - Places routines. - Places goal sessions. - Adds
transitions and breaks. - Detects collisions. - Enforces sleep and
category rules. - Validates the final schedule.

AI may request a schedule, but the engine decides whether the proposed
schedule is feasible.

## 3. Inputs

The engine should receive a versioned planning input containing: -
Planning period and user timezone. - Wake and sleep preferences. - Fixed
commitments. - One-off fixed events. - Flexible one-off tasks and due
windows. - Routines and allowed time windows. - Goal work budgets in
minutes. - Goal priority and computed urgency. - Goal category. -
Category time limits and borrowing policy. - Preferred daily sequence. -
Energy/concentration profile. - Travel and preparation durations. -
Transition and break settings. - Existing calendar blocks to preserve or
reconsider. - Scheduling preferences and manually locked blocks.

## 4. Constraint classes

### 4.1 Hard constraints

Must not be violated: - Fixed commitments. - Fixed-time one-off
events. - User-locked calendar blocks. - No overlapping scheduled
blocks. - Timezone and valid date boundaries. - Sleep protection, except
the explicit exceptional priority 6 policy. - Required minimum durations
where the user has specified them.

### 4.2 Soft constraints

Optimize where possible: - Preferred morning/evening patterns. - Energy
alignment. - Preferred training times. - Category budgets. - Desired
end-of-day personal time. - Preferred session lengths. - Break
placement. - Minimizing fragmentation. - Avoiding excessive context
switching.

The engine should report soft-constraint compromises when material.

## 5. Planning stages

1.  Normalize and validate input.
2.  Expand recurring fixed commitments and routines into the planning
    period.
3.  Reserve hard constraints.
4.  Calculate free intervals.
5.  Apply category budgets and exceptional borrowing rules.
6.  Place high-urgency and high-priority goal sessions.
7.  Place remaining goal sessions.
8.  Add travel, preparation, transitions, and breaks.
9.  Optimize energy alignment and schedule compactness.
10. Validate all constraints.
11. Produce a schedule plus diagnostics and explanation metadata.

## 6. Block sizing

There is no fixed global block length. The engine may choose session
durations based on: - Goal/task type. - User preference. - Available
interval size. - Cognitive demand. - Training type. - Fatigue and energy
profile. - Minimum useful session length.

Short transitions between goals should be configurable; the initial
suggested default is 10 minutes. Longer breaks should be inserted after
extended work periods.

The engine should avoid splitting a session into fragments too small to
be useful.

## 7. Priority and deadline handling

Keep `manual_priority` separate from `effective_urgency`.

A configurable urgency function may consider: - Manual priority. - Time
remaining until deadline. - Estimated remaining work. - Progress rate. -
Consequence of missing the deadline.

Do not hardcode a single formula as an immutable product rule. Store
enough explanation metadata to show why a goal was scheduled ahead of
another.

## 8. Category budgets and exceptional borrowing

Normal planning should respect category allocations.

Exceptional borrowing: - Priority 5: leisure first; training only if AI
determines it is necessary. - Priority 6: leisure first, then training,
and sleep only in an extreme case. - Priority 1--4: no automatic
cross-category borrowing by default.

Every borrowed minute should be attributable to a goal and have a reason
recorded.

## 9. Handling insufficient capacity

If total requested work cannot fit: 1. Preserve hard constraints. 2.
Preserve sleep under normal priorities. 3. Preserve fixed commitments
and locked blocks. 4. Re-evaluate low-priority goal budgets. 5. Apply
permitted category borrowing for priorities 5 and 6. 6. Reduce or defer
lower-urgency sessions. 7. Return an explicit capacity shortfall report.

Do not create overlapping blocks or silently compress tasks below their
minimum useful duration.

## 10. Replanning

Replanning may be triggered by: - New fixed event. - User manual
calendar edit. - Early completion. - Missed or partial session after
evening review. - Updated goal progress. - Weekly review. - Change to
availability or settings.

Replanning should preserve: - Completed session records. - User-locked
blocks. - Fixed commitments. - Historical plan versions.

Only affected future blocks should be changed where possible. Full-week
regeneration is allowed when necessary, but the change summary should
identify the material differences.

## 11. Early completion

When a session finishes early: - Record actual duration. - Calculate
effective time after efficiency is provided. - Optionally move later
blocks earlier. - Revalidate transitions and fixed constraints. - Do not
assume that all freed time must be filled with more work.

## 12. Missed sessions

Do not immediately replan every missed session. Queue it for the evening
review unless the user explicitly requests immediate replanning or a new
event makes an immediate change necessary.

The weekly review determines whether missed work needs to be recovered
based on actual goal progress and urgency.

## 13. Output contract

The engine should return: - Scheduled blocks. - Unscheduled requested
minutes. - Constraint violations (must be empty for a committable
schedule). - Soft-constraint warnings. - Category totals. - Goal
totals. - Borrowed time by category and reason. - Changes relative to
previous schedule version. - A machine-readable validation result.

## 14. Determinism and testing

Given identical normalized inputs, settings, and engine version, the
engine should produce the same result unless a documented randomized
optimization mode is deliberately enabled.

Test: - No overlap. - Hard commitments never moved. - Sleep protected
under priorities 1--5. - Priority 5 and 6 borrowing order. - Routine
windows respected. - Travel/preparation accounted for. - Timezone and
daylight-saving transitions. - Capacity shortage reported. - Replanning
preserves completed history. - Manual locks remain intact.
