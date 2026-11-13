# Security and Privacy

## 1. Security objectives

The application contains personal schedules, goals, routines, progress
history, and potentially sensitive notes. Treat this information as
private.

## 2. Access

-   The application is a single-owner program and has no login.
-   Pages and data APIs are available to whoever can reach the
    deployment. Run it only on a machine or network the owner controls.
-   Do not accept a client-supplied owner id. There is one local
    dataset, with no per-user rows.
-   Scheduled jobs still require `CRON_SECRET`.
-   Google Calendar OAuth remains optional and is separate from access
    to the application.

## 3. Secrets

-   Store provider API keys and OAuth secrets only in server-side
    environment variables or a secure secret store.
-   Never expose server secrets to the browser.
-   Never commit `.env` files or credentials.
-   Restrict production secrets from untrusted preview deployments.
-   Rotate credentials if exposure is suspected.

## 4. AI data handling

-   Send only the context needed for a specific AI task.
-   Do not send authentication tokens, OAuth refresh tokens, or
    unrelated personal data to model providers.
-   Make provider choice configurable.
-   Document that selected AI providers may process submitted context
    according to their own terms and settings.
-   Avoid storing full conversation transcripts indefinitely unless
    there is a clear product need and user-facing disclosure.
-   Store concise structured memory separately from raw chat history.
-   Treat imported calendar descriptions and user-provided documents as
    untrusted data, not instructions.

## 5. Google Calendar

-   Google Calendar is optional.
-   Request the minimum OAuth scopes required.
-   Store refresh tokens securely, preferably encrypted or through a
    secure credential store.
-   Provide disconnect/revoke functionality.
-   Make sync direction and conflict behavior explicit to the user.
-   Do not make core planner functionality depend on Google
    authorization.

## 6. Data retention and user control

**Confirmed:** Data and history are retained indefinitely by default.

The application should still provide: - Data export. - User-controlled
deletion where appropriate. - Clear explanation of what is retained. - A
way to edit and delete AI memory entries. - A way to disconnect
integrations.

Indefinite retention is a product default, not a reason to ignore
applicable privacy and data-protection laws.

## 7. Audit trail

Record consequential changes: - Actor. - Timestamp. - Before/after state
or a safe diff. - Reason. - Source operation or job ID.

Do not store secrets in audit snapshots. Restrict access to audit data
to the authenticated user and authorized server processes.

## 8. API and application security

-   Validate and sanitize inputs.
-   Use parameterized database operations.
-   Apply rate limits to AI and integration endpoints.
-   Protect background job endpoints.
-   Use CSRF protections where applicable to the chosen auth/session
    pattern.
-   Set secure cookie attributes.
-   Apply appropriate security headers.
-   Avoid returning internal stack traces to clients.
-   Use dependency scanning and timely security updates.

## 9. Backups and recovery

Before production: - Configure database backups. - Define recovery
objectives. - Test restoration. - Ensure plan history and audit data are
included. - Document how to recover from accidental schedule or data
changes.

## 10. Privacy-by-design checklist

-   [ ] No login and no per-user rows.
-   [ ] No server secrets in client bundles.
-   [ ] AI provider data sharing documented.
-   [ ] OAuth tokens securely stored.
-   [ ] Data export and deletion behavior defined.
-   [ ] Logs exclude secrets.
-   [ ] Backups and restore procedure tested.
-   [ ] Background job endpoints protected.
