# API Specification

## 1. Conventions

This document defines proposed API boundaries. Exact paths and payloads
may be refined during implementation.

-   Base path: `/api`
-   Format: JSON
-   Access: no application login. The deployment has one dataset.
    Scheduled jobs require `CRON_SECRET`. Google Calendar uses its own
    OAuth flow.
-   Validation: schema validation at every write boundary.
-   Time: ISO 8601 timestamps; persist UTC and interpret using the
    user's IANA timezone.
-   Errors: stable machine-readable error codes plus user-safe messages.
-   Mutating requests should support idempotency where duplicate
    execution is possible.

## 2. Proposed endpoint groups

  ------------------------------------------------------------------------------------
  Method                  Endpoint                             Purpose
  ----------------------- ------------------------------------ -----------------------
  GET                     `/api/profile`                       Read profile and
                                                               preferences

  PATCH                   `/api/profile`                       Update profile

  GET                     `/api/settings`                      Read planning settings

  PUT                     `/api/settings`                      Replace/update settings

  GET                     `/api/goals`                         List goals

  POST                    `/api/goals`                         Create a goal after
                                                               user confirmation

  GET                     `/api/goals/:id`                     Read goal details

  PATCH                   `/api/goals/:id`                     Update goal

  POST                    `/api/goals/:id/progress`            Add progress
                                                               observation

  POST                    `/api/goals/:id/archive`             Archive goal

  GET                     `/api/calendar`                      Read calendar range

  POST                    `/api/calendar/items`                Create one-off event or
                                                               commitment

  PATCH                   `/api/calendar/items/:id`            Edit calendar item

  POST                    `/api/calendar/replan`               Request replanning

  POST                    `/api/sessions/:id/complete`         Record actual duration
                                                               and efficiency

  GET                     `/api/plans/current`                 Get active plan

  GET                     `/api/plans/:id/versions`            List plan versions

  POST                    `/api/plans/:id/restore`             Restore a previous plan
                                                               as a new version

  GET                     `/api/analytics/summary`             Retrieve discipline
                                                               metrics

  GET                     `/api/ai/memory`                     List editable AI memory

  PATCH                   `/api/ai/memory/:id`                 Edit a memory entry

  DELETE                  `/api/ai/memory/:id`                 Delete a memory entry

  POST                    `/api/assistant/messages`            Send a user message to
                                                               the assistant

  GET                     `/api/changes`                       View change history

  POST                    `/api/integrations/google/connect`   Begin Google OAuth

  POST                    `/api/integrations/google/sync`      Trigger calendar
                                                               synchronization

  POST                    `/api/jobs/evening-review`           Secured background job
                                                               trigger

  POST                    `/api/jobs/weekly-review`            Secured background job
                                                               trigger
  ------------------------------------------------------------------------------------

## 3. Goal creation flow

Recommended flow: 1. Client sends natural-language message to assistant.
2. AI returns a typed `goal_draft` and any clarification questions. 3.
Client displays the proposed goal. 4. User confirms. 5. Client calls
`POST /api/goals`. 6. Server validates the goal, persists it, and
requests budget/schedule recalculation.

The AI assistant endpoint should not silently create a goal as a side
effect of merely discussing one.

## 4. Scheduling request contract

A replan request should include: - Planning range. - Trigger reason. -
Optional changed item IDs. - Whether the user explicitly requested
immediate replanning. - Optional user note.

The server should load authoritative constraints from the database
rather than trusting client-supplied copies of settings or priorities.

## 5. Session completion contract

A completion request should capture: - Actual duration in minutes. -
Efficiency rating 1--10. - Completion status. - Optional notes. -
Optional user-reported progress update.

Calculate effective time server-side:

`effective_minutes = actual_minutes * efficiency_rating / 10`

Do not derive overall goal progress from the efficiency rating.

## 6. Plan restoration

Restoration must: - Verify ownership and authorization. - Load the
requested historical version. - Revalidate it against current hard
constraints. - Create a new plan version based on the restored
content. - Record the restoration in the change log. - Never delete
intervening plan versions.

If the historical plan is no longer feasible, return validation details
and require a safe adjustment.

## 7. Error model

Suggested error codes: - `VALIDATION_ERROR` - `UNAUTHENTICATED` -
`FORBIDDEN` - `NOT_FOUND` - `SCHEDULING_CONFLICT` -
`INSUFFICIENT_CAPACITY` - `AI_PROVIDER_UNAVAILABLE` -
`AI_OUTPUT_INVALID` - `INTEGRATION_NOT_CONNECTED` - `SYNC_CONFLICT` -
`JOB_ALREADY_RUNNING` - `INTERNAL_ERROR`

## 8. Security requirements

-   Authenticate every private endpoint.
-   Authorize ownership server-side.
-   Never expose Supabase service-role keys to the browser.
-   Validate all AI output and external integration payloads.
-   Protect job endpoints with a secret or signed authorization
    mechanism.
-   Rate-limit assistant and expensive AI endpoints.
-   Avoid leaking provider errors, OAuth tokens, or internal stack
    traces to clients.
