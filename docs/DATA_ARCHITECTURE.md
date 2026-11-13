# Data Architecture

## 1. Design goals

-   PostgreSQL is the system of record.
-   Use explicit relational entities for goals, calendar items,
    sessions, plans, and metrics.
-   Preserve historical records indefinitely by default.
-   Keep current state separate from immutable or append-only history
    where practical.
-   Store timestamps in UTC and retain the user's IANA timezone for
    calendar interpretation.
-   The database holds one owner's data. Tables do not carry a user id,
    and access control is the private deployment rather than row-level
    policies.

## 2. Recommended core entities

The following is a logical model, not a final migration script.

### 2.1 `user_profile`

One local profile, not an account. - `id` UUID, primary key.
- `display_name` - `timezone` (IANA
identifier) - `locale` (initially `pl`) - `created_at`, `updated_at`

### 2.2 `user_settings`

Planning and application preferences. One row. - `id` - `wake_time`,
`sleep_time` - `category_budgets` JSONB or normalized category-budget
rows - `priority_extra_time_limits` JSONB - `transition_minutes` -
`break_preferences` - `preferred_day_pattern` - `energy_profile` -
`calendar_preferences` - `created_at`, `updated_at`

Use typed validation at the application boundary. Consider normalized
tables if settings become frequently queried or independently versioned.

### 2.3 `goals`

-   `id`
-   `name`
-   `description`
-   `category` enum: `training`, `learning_work`, `leisure`
-   `manual_priority` integer 1--6
-   `current_level` nullable
-   `desired_level` nullable
-   `deadline_at` nullable
-   `difficulty` integer 1--10
-   `progress_value` numeric
-   `progress_unit` or `progress_method`
-   `status`: `active`, `paused`, `completed`, `archived`
-   `ai_estimates` JSONB with provenance/confidence
-   `created_at`, `updated_at`, `completed_at`

### 2.4 `calendar_items`

Represents fixed commitments, routines, one-off events, and generated
goal sessions, or use a shared base table plus subtype tables if
stronger constraints are needed. - `id` - `item_type`:
`goal_session`, `one_off_event`, `routine_occurrence`,
`fixed_commitment` - `title` - `description` - `start_at`, `end_at` -
`timezone` - `is_fixed` - `is_user_locked` - `source_goal_id` nullable -
`recurrence_rule` nullable - `flexible_window_start`,
`flexible_window_end` nullable - `travel_minutes`,
`preparation_minutes` - `status` - `created_at`, `updated_at`

Avoid relying on a single generic table if subtype-specific rules become
difficult to enforce. A normalized subtype design is acceptable.

### 2.5 `goal_sessions`

Execution record for scheduled or ad-hoc work. - `id` -
`goal_id` - `calendar_item_id` nullable - `planned_minutes` -
`actual_minutes` - `efficiency_rating` integer 1--10 nullable -
`effective_minutes` - `difficulty_snapshot` integer 1--10 -
`completion_status`: `not_started`, `partial`, `completed`, `skipped` -
`started_at`, `ended_at` - `notes` - `created_at`, `updated_at`

Store the difficulty snapshot so historical metrics do not change if the
goal's current difficulty is edited later.

### 2.6 `goal_progress_entries`

-   `id`
-   `goal_id`
-   `progress_value`
-   `progress_unit`
-   `reported_at`
-   `source`: `user`, `ai_assisted`, `imported`
-   `notes`

Progress entries are historical observations; do not overwrite the
history when current progress changes.

### 2.7 `weekly_plans`

-   `id`
-   `period_start`, `period_end`
-   `version_number`
-   `status`: `draft`, `active`, `superseded`, `restored`
-   `generation_reason`
-   `ai_summary`
-   `engine_version`
-   `created_at`

### 2.8 `weekly_goal_budgets`

-   `id`
-   `weekly_plan_id`
-   `goal_id`
-   `planned_minutes`
-   `reason`
-   `borrowed_from_category` nullable
-   `confidence` nullable

### 2.9 `plan_changes`

Append-only audit record: - `id` - `weekly_plan_id` -
`change_type` - `actor`: `user`, `ai`, `system` - `before_snapshot`
JSONB - `after_snapshot` JSONB - `reason` - `created_at`

### 2.10 `ai_memory_entries`

-   `id`
-   `memory_type`
-   `content` JSONB or typed columns
-   `source_type`
-   `source_reference` nullable
-   `confidence`
-   `is_user_confirmed`
-   `created_at`, `updated_at`, `last_observed_at`

Memory entries must be inspectable and editable by the user.

### 2.11 `background_jobs` / `review_runs`

Track evening reviews, weekly reviews, and other scheduled operations: -
`id` - `job_type` - `scheduled_for` - `started_at`,
`completed_at` - `status` - `idempotency_key` - `result_summary` -
`error_code`, `error_details`

Use a reliable queue or durable job pattern rather than relying solely
on in-memory execution.

### 2.12 `integration_connections`

For optional Google Calendar integration: - `id` -
`provider` - encrypted token references or secure secret-store
references - `scopes` - `status` - `connected_at`, `last_sync_at`

Do not store plaintext OAuth refresh tokens in ordinary application
tables.

## 3. Relationships

-   One user has one profile and settings record.
-   One user has many goals.
-   One goal has many sessions and progress entries.
-   One weekly plan has many goal budgets and generated calendar blocks.
-   One user has many calendar items and plan versions.
-   One user has many memory entries, change records, and review runs.
-   Google Calendar connection is optional and belongs to the user.

## 4. Historical integrity

-   Do not delete completed sessions when a plan is regenerated.
-   Keep plan versions and change records.
-   Snapshot values such as difficulty and planned duration on execution
    records.
-   Restoring an older plan creates a new version; it does not erase
    newer versions.
-   Retain data indefinitely by default, subject to applicable law and
    explicit user deletion requests.

## 5. Indexing and constraints

Recommended: - Index calendar items by `(start_at, end_at)`. - Index sessions by `(goal_id, started_at)`. - Index progress entries by
`(goal_id, reported_at)`. - Index plans by
`(period_start, version_number)`. - Add database checks for
priority 1--6, difficulty 1--10, efficiency 1--10, and valid time
ranges. - Enforce non-overlap in the scheduling engine and consider
PostgreSQL exclusion constraints for relevant fixed-time rows.

## 6. Access

There is no login and no per-user row. The database is private to this
deployment. Scheduled jobs remain protected by `CRON_SECRET`.
