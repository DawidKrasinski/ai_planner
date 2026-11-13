CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY,
  email text
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc
    JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
    WHERE pg_namespace.nspname = 'auth' AND pg_proc.proname = 'uid'
  ) THEN
    CREATE FUNCTION auth.uid()
    RETURNS uuid
    LANGUAGE sql
    STABLE
    AS $fn$
      SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $fn$;
  END IF;
END $$;

DO $$
BEGIN
  CREATE ROLE authenticated NOINHERIT;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$ BEGIN
  CREATE TYPE goal_category AS ENUM ('training', 'learning_work', 'leisure');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE goal_status AS ENUM ('active', 'paused', 'completed', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE calendar_item_type AS ENUM (
    'goal_session', 'one_off_event', 'routine_occurrence', 'fixed_commitment',
    'flexible_task', 'meal', 'transition', 'break', 'travel', 'preparation'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE calendar_item_status AS ENUM ('scheduled', 'completed', 'partial', 'skipped', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE session_status AS ENUM ('not_started', 'in_progress', 'partial', 'completed', 'skipped');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE plan_status AS ENUM ('draft', 'active', 'superseded', 'restored');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE change_actor AS ENUM ('user', 'ai', 'system');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE job_status AS ENUM ('pending', 'running', 'succeeded', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE progress_source AS ENUM ('user', 'ai_assisted', 'imported');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name text NOT NULL,
  timezone text NOT NULL DEFAULT 'Europe/Warsaw',
  locale text NOT NULL DEFAULT 'pl',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES user_profiles (id) ON DELETE CASCADE,
  settings jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles (id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  category goal_category NOT NULL,
  manual_priority integer NOT NULL CHECK (manual_priority BETWEEN 1 AND 6),
  current_level text,
  desired_level text,
  deadline_at timestamptz,
  difficulty integer NOT NULL CHECK (difficulty BETWEEN 1 AND 10),
  difficulty_is_estimate boolean NOT NULL DEFAULT false,
  progress_value numeric NOT NULL DEFAULT 0,
  progress_method text NOT NULL DEFAULT 'percent',
  status goal_status NOT NULL DEFAULT 'active',
  ai_estimates jsonb,
  planning_notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS goal_progress_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles (id) ON DELETE CASCADE,
  goal_id uuid NOT NULL REFERENCES goals (id) ON DELETE CASCADE,
  progress_value numeric NOT NULL,
  progress_unit text NOT NULL,
  reported_at timestamptz NOT NULL DEFAULT now(),
  source progress_source NOT NULL DEFAULT 'user',
  notes text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS routine_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles (id) ON DELETE CASCADE,
  title text NOT NULL,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  window_start text NOT NULL,
  window_end text NOT NULL,
  days_of_week integer[] NOT NULL,
  travel_minutes integer NOT NULL DEFAULT 0,
  preparation_minutes integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fixed_commitment_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles (id) ON DELETE CASCADE,
  title text NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  days_of_week integer[] NOT NULL,
  travel_minutes integer NOT NULL DEFAULT 0,
  preparation_minutes integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS weekly_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles (id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  version_number integer NOT NULL,
  status plan_status NOT NULL DEFAULT 'draft',
  generation_reason text NOT NULL,
  ai_summary text NOT NULL DEFAULT '',
  engine_version text NOT NULL,
  engine_diagnostics jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, period_start, version_number)
);

CREATE TABLE IF NOT EXISTS weekly_goal_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_plan_id uuid NOT NULL REFERENCES weekly_plans (id) ON DELETE CASCADE,
  goal_id uuid NOT NULL REFERENCES goals (id) ON DELETE CASCADE,
  planned_minutes integer NOT NULL CHECK (planned_minutes >= 0),
  reason text NOT NULL,
  borrowed_from_category text,
  confidence numeric
);

CREATE TABLE IF NOT EXISTS calendar_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles (id) ON DELETE CASCADE,
  item_type calendar_item_type NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  timezone text NOT NULL,
  is_fixed boolean NOT NULL DEFAULT false,
  is_user_locked boolean NOT NULL DEFAULT false,
  source_goal_id uuid REFERENCES goals (id) ON DELETE SET NULL,
  routine_definition_id uuid REFERENCES routine_definitions (id) ON DELETE SET NULL,
  commitment_definition_id uuid REFERENCES fixed_commitment_definitions (id) ON DELETE SET NULL,
  weekly_plan_id uuid REFERENCES weekly_plans (id) ON DELETE SET NULL,
  flexible_window_start timestamptz,
  flexible_window_end timestamptz,
  travel_minutes integer NOT NULL DEFAULT 0,
  preparation_minutes integer NOT NULL DEFAULT 0,
  status calendar_item_status NOT NULL DEFAULT 'scheduled',
  placement_reason text NOT NULL DEFAULT '',
  ai_generated boolean NOT NULL DEFAULT false,
  external_id text,
  external_etag text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_at > start_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS calendar_items_external_unique
  ON calendar_items (user_id, external_id)
  WHERE external_id IS NOT NULL;

ALTER TABLE calendar_items DROP CONSTRAINT IF EXISTS calendar_items_no_overlap;
ALTER TABLE calendar_items ADD CONSTRAINT calendar_items_no_overlap
  EXCLUDE USING gist (
    user_id WITH =,
    tstzrange(start_at, end_at, '[)') WITH &&
  ) WHERE (status <> 'cancelled');

CREATE TABLE IF NOT EXISTS goal_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles (id) ON DELETE CASCADE,
  goal_id uuid NOT NULL REFERENCES goals (id) ON DELETE CASCADE,
  calendar_item_id uuid REFERENCES calendar_items (id) ON DELETE SET NULL,
  planned_minutes integer NOT NULL CHECK (planned_minutes >= 0),
  actual_minutes integer,
  efficiency_rating integer CHECK (efficiency_rating IS NULL OR efficiency_rating BETWEEN 1 AND 10),
  effective_minutes numeric,
  difficulty_snapshot integer NOT NULL CHECK (difficulty_snapshot BETWEEN 1 AND 10),
  priority_snapshot integer NOT NULL CHECK (priority_snapshot BETWEEN 1 AND 6),
  completion_status session_status NOT NULL DEFAULT 'not_started',
  started_at timestamptz,
  ended_at timestamptz,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plan_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles (id) ON DELETE CASCADE,
  weekly_plan_id uuid REFERENCES weekly_plans (id) ON DELETE SET NULL,
  change_type text NOT NULL,
  actor change_actor NOT NULL,
  before_snapshot jsonb,
  after_snapshot jsonb,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_memory_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles (id) ON DELETE CASCADE,
  memory_type text NOT NULL,
  content jsonb NOT NULL,
  source_type text NOT NULL,
  source_reference text,
  confidence numeric NOT NULL DEFAULT 1,
  is_user_confirmed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_observed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles (id) ON DELETE CASCADE,
  screen text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES ai_conversations (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles (id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  structured jsonb,
  provider text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS background_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles (id) ON DELETE CASCADE,
  job_type text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  started_at timestamptz,
  completed_at timestamptz,
  status job_status NOT NULL DEFAULT 'pending',
  idempotency_key text NOT NULL UNIQUE,
  result_summary jsonb,
  error_code text,
  error_details text,
  attempt_count integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS integration_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles (id) ON DELETE CASCADE,
  provider text NOT NULL,
  encrypted_refresh_token text,
  scopes text[] NOT NULL DEFAULT '{}',
  status text NOT NULL,
  export_enabled boolean NOT NULL DEFAULT false,
  connected_at timestamptz,
  last_sync_at timestamptz,
  last_error text,
  UNIQUE (user_id, provider)
);

CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  bucket_key text NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL,
  PRIMARY KEY (bucket_key, window_start)
);

CREATE INDEX IF NOT EXISTS goals_user_idx ON goals (user_id, status);
CREATE INDEX IF NOT EXISTS calendar_items_range_idx ON calendar_items (user_id, start_at, end_at);
CREATE INDEX IF NOT EXISTS goal_sessions_goal_idx ON goal_sessions (user_id, goal_id, started_at);
CREATE INDEX IF NOT EXISTS progress_goal_idx ON goal_progress_entries (goal_id, reported_at);
CREATE INDEX IF NOT EXISTS plans_period_idx ON weekly_plans (user_id, period_start, version_number);
CREATE INDEX IF NOT EXISTS jobs_status_idx ON background_jobs (status, scheduled_for);

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_progress_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_commitment_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_goal_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_memory_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE background_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_profiles_owner ON user_profiles;
CREATE POLICY user_profiles_owner ON user_profiles
  FOR ALL TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS user_settings_owner ON user_settings;
CREATE POLICY user_settings_owner ON user_settings
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS goals_owner ON goals;
CREATE POLICY goals_owner ON goals
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS progress_owner ON goal_progress_entries;
CREATE POLICY progress_owner ON goal_progress_entries
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS routines_owner ON routine_definitions;
CREATE POLICY routines_owner ON routine_definitions
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS commitments_owner ON fixed_commitment_definitions;
CREATE POLICY commitments_owner ON fixed_commitment_definitions
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS plans_owner ON weekly_plans;
CREATE POLICY plans_owner ON weekly_plans
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS budgets_owner ON weekly_goal_budgets;
CREATE POLICY budgets_owner ON weekly_goal_budgets
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM weekly_plans WHERE weekly_plans.id = weekly_plan_id AND weekly_plans.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM weekly_plans WHERE weekly_plans.id = weekly_plan_id AND weekly_plans.user_id = auth.uid())
  );

DROP POLICY IF EXISTS calendar_owner ON calendar_items;
CREATE POLICY calendar_owner ON calendar_items
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS sessions_owner ON goal_sessions;
CREATE POLICY sessions_owner ON goal_sessions
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS changes_owner ON plan_changes;
CREATE POLICY changes_owner ON plan_changes
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS memory_owner ON ai_memory_entries;
CREATE POLICY memory_owner ON ai_memory_entries
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS conversations_owner ON ai_conversations;
CREATE POLICY conversations_owner ON ai_conversations
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS messages_owner ON ai_messages;
CREATE POLICY messages_owner ON ai_messages
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS jobs_owner ON background_jobs;
CREATE POLICY jobs_owner ON background_jobs
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS integrations_owner ON integration_connections;
CREATE POLICY integrations_owner ON integration_connections
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
