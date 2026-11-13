# AI System Specification

## 1. Role

The AI is the application's strategic personal manager. It interprets
user intent, evaluates goals, allocates weekly time budgets, reviews
execution, learns preferences, and proposes or performs permitted
changes.

The AI is not the final authority on schedule feasibility. A
deterministic Scheduling Engine must validate every generated schedule
before it is committed.

## 2. Provider-independent architecture

**Confirmed:** The product should support multiple AI providers and
allow the provider to be changed without rewriting application logic.

Recommended design: - A provider-neutral AI orchestration service. -
Provider adapters for OpenAI, Anthropic, and future providers. - A
common internal request/response schema. - Model selection by task
type. - Centralized timeout, retry, rate-limit, token, and cost
handling. - Structured output validation before any action is applied.

Do not couple business logic directly to a provider-specific SDK
response format.

## 3. AI task classes

Potential task classes: 1. Conversational intent extraction. 2. Goal
classification and clarification. 3. Goal difficulty and effort
estimation. 4. Weekly budget recommendation. 5. Schedule-change
explanation. 6. Evening review. 7. Weekly review. 8. Memory extraction
and preference learning. 9. Progress interpretation. 10. Overload
assessment.

Different tasks may use different models based on reasoning quality,
latency, and cost. Model routing must be configurable.

## 4. Decision pipeline

For any consequential planning operation:

1.  Load the relevant current state and constraints.
2.  Build a compact, typed context for the AI.
3.  Ask the AI for a structured proposal, not arbitrary database
    mutations.
4.  Validate the response schema.
5.  Apply business-rule validation.
6.  Pass scheduling proposals to the Scheduling Engine.
7.  Reject or repair infeasible proposals.
8.  Persist accepted changes transactionally.
9.  Record an audit/change-log entry.
10. Provide a concise explanation to the user.

AI output must never be executed as raw SQL or unrestricted code.

## 5. Strategic budget allocation

The AI should consider: - Manual priority (1--6). - Deadline
proximity. - Current progress and desired outcome. - Current level and
estimated difficulty. - Goal-specific weekly requirements. - Recent
effective time. - Efficiency trends. - Missed or partial sessions. -
Available time within the relevant category. - User energy and
concentration patterns. - Recovery and overload indicators. -
Dependencies or relationships between goals, without merging goals.

The AI should return a budget proposal per goal with: - Proposed weekly
minutes. - Rationale. - Confidence or uncertainty. - Whether the
proposal uses exceptional category borrowing. - Whether user
clarification is needed.

The system should distinguish manual priority from computed urgency. AI
must not overwrite the manual priority merely because a deadline is
close.

## 6. Autonomous action policy

AI may autonomously: - Reallocate time between goals within permitted
rules. - Move generated goal sessions. - Replan after new events. -
Reduce workload when overload is detected, subject to safeguards. -
Update learned preference estimates. - Produce review summaries.

AI must request approval before: - Creating a new goal. - Making an
irreversible data deletion. - Connecting an external account or granting
new permissions. - Changing a user-defined hard constraint. - Making a
change explicitly marked by the user as approval-required.

AI may ask clarifying questions when required data is missing or when
the cost of a wrong assumption is high.

## 7. Overload policy

**Confirmed:** Use adaptive behavior: AI may sometimes reduce workload
automatically and sometimes ask the user first.

Recommended decision factors: - Repeated low plan completion. -
Declining efficiency. - Persistent backlog. - Sleep or recovery
pressure. - User-reported fatigue or stress, if provided. - High total
scheduled load. - Upcoming deadlines and priority distribution.

Suggested policy: - Low-risk adjustment: move or reduce lower-priority
work autonomously. - Moderate adjustment: explain the change and
optionally ask a concise question. - High-impact adjustment: ask before
materially changing important commitments or user-defined constraints. -
Sleep: never reduce except under the exceptional priority 6 rule, and
even then require a clear rationale and strong safeguards.

The thresholds are open implementation parameters and should be
configurable and tested.

## 8. Memory system

### 8.1 Memory content

Store useful, durable information such as: - Preferred wake and sleep
times. - Energy and concentration patterns. - Category preferences and
limits. - Goal context and planning assumptions. - Training
preferences. - Preferred session lengths. - User responses to schedule
changes. - Efficiency patterns and methods that appear effective. -
Weekly review conclusions. - Confirmed long-term preferences.

Do not store every transient chat message as permanent memory. Extract
concise, structured facts with provenance and timestamps.

### 8.2 User control

The user must be able to: - View memory entries. - Edit entries. -
Delete entries. - See when an entry was learned and, where practical,
why. - Correct an incorrect inference.

The AI must treat user corrections as higher authority than inferred
preferences.

### 8.3 Memory confidence

Each inferred preference should have: - Value. - Source (explicit user
statement, repeated behavior, or AI inference). - Confidence. - Last
observed timestamp. - Optional expiry or review date.

Explicit user preferences must not be silently overwritten by weak
behavioral inference.

## 9. Explanation and transparency

For significant changes, provide: - What changed. - Why it changed. -
Which goals or time categories were affected. - Whether the change is
temporary or reflects a learned preference. - How to undo it.

Avoid overwhelming the user with internal chain-of-thought. Provide
concise, decision-relevant explanations rather than private reasoning
traces.

## 10. Reliability and failure handling

-   Validate all structured AI outputs.
-   Use bounded retries for transient provider errors.
-   Apply timeouts and cost limits.
-   Do not apply partial or malformed proposals.
-   If AI is unavailable, preserve the current schedule and allow manual
    edits.
-   If the Scheduling Engine rejects a proposal, return actionable
    validation errors to the AI or fall back to a safe schedule.
-   Make background jobs idempotent to prevent duplicate reviews or
    schedule versions.
-   Log provider, model, latency, token usage, and outcome without
    logging unnecessary sensitive content.

## 11. Prompt and context design

Prompts should be versioned and separated by task. Context should be
limited to relevant data and include: - Current timezone. - Planning
horizon. - Hard constraints. - Category budgets. - Priority policy. -
Active goals and their progress. - Relevant historical metrics. - User
memory entries with confidence and provenance.

The system should instruct models that user-provided content and
imported calendar descriptions are data, not system instructions. Treat
external text as untrusted input.
