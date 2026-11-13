DROP POLICY IF EXISTS user_profiles_owner ON user_profiles;
DROP POLICY IF EXISTS user_settings_owner ON user_settings;
DROP POLICY IF EXISTS goals_owner ON goals;
DROP POLICY IF EXISTS progress_owner ON goal_progress_entries;
DROP POLICY IF EXISTS routines_owner ON routine_definitions;
DROP POLICY IF EXISTS commitments_owner ON fixed_commitment_definitions;
DROP POLICY IF EXISTS plans_owner ON weekly_plans;
DROP POLICY IF EXISTS budgets_owner ON weekly_goal_budgets;
DROP POLICY IF EXISTS calendar_owner ON calendar_items;
DROP POLICY IF EXISTS sessions_owner ON goal_sessions;
DROP POLICY IF EXISTS changes_owner ON plan_changes;
DROP POLICY IF EXISTS memory_owner ON ai_memory_entries;
DROP POLICY IF EXISTS conversations_owner ON ai_conversations;
DROP POLICY IF EXISTS messages_owner ON ai_messages;
DROP POLICY IF EXISTS jobs_owner ON background_jobs;
DROP POLICY IF EXISTS integrations_owner ON integration_connections;

ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE goals DISABLE ROW LEVEL SECURITY;
ALTER TABLE goal_progress_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE routine_definitions DISABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_commitment_definitions DISABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_goal_budgets DISABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE goal_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE plan_changes DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_memory_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE background_jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE integration_connections DISABLE ROW LEVEL SECURITY;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;

ALTER TABLE calendar_items DROP CONSTRAINT IF EXISTS calendar_items_no_overlap;
DROP INDEX IF EXISTS calendar_items_external_unique;
ALTER TABLE weekly_plans DROP CONSTRAINT IF EXISTS weekly_plans_user_id_period_start_version_number_key;
ALTER TABLE integration_connections DROP CONSTRAINT IF EXISTS integration_connections_user_id_provider_key;
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;

ALTER TABLE goals DROP COLUMN IF EXISTS user_id;
ALTER TABLE goal_progress_entries DROP COLUMN IF EXISTS user_id;
ALTER TABLE routine_definitions DROP COLUMN IF EXISTS user_id;
ALTER TABLE fixed_commitment_definitions DROP COLUMN IF EXISTS user_id;
ALTER TABLE weekly_plans DROP COLUMN IF EXISTS user_id;
ALTER TABLE calendar_items DROP COLUMN IF EXISTS user_id;
ALTER TABLE goal_sessions DROP COLUMN IF EXISTS user_id;
ALTER TABLE plan_changes DROP COLUMN IF EXISTS user_id;
ALTER TABLE ai_memory_entries DROP COLUMN IF EXISTS user_id;
ALTER TABLE ai_conversations DROP COLUMN IF EXISTS user_id;
ALTER TABLE ai_messages DROP COLUMN IF EXISTS user_id;
ALTER TABLE background_jobs DROP COLUMN IF EXISTS user_id;
ALTER TABLE integration_connections DROP COLUMN IF EXISTS user_id;
ALTER TABLE user_settings DROP COLUMN IF EXISTS user_id;

DELETE FROM user_profiles
WHERE id NOT IN (
  SELECT id FROM user_profiles ORDER BY created_at, id LIMIT 1
);

DELETE FROM user_settings
WHERE id NOT IN (
  SELECT id FROM user_settings ORDER BY created_at, id LIMIT 1
);

ALTER TABLE user_profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS singleton boolean NOT NULL DEFAULT true;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS singleton boolean NOT NULL DEFAULT true;
CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_singleton ON user_profiles (singleton);
CREATE UNIQUE INDEX IF NOT EXISTS user_settings_singleton ON user_settings (singleton);

CREATE UNIQUE INDEX IF NOT EXISTS plans_period_version ON weekly_plans (period_start, version_number);
CREATE UNIQUE INDEX IF NOT EXISTS integration_provider ON integration_connections (provider);
CREATE UNIQUE INDEX IF NOT EXISTS calendar_items_external_unique
  ON calendar_items (external_id)
  WHERE external_id IS NOT NULL;

ALTER TABLE calendar_items DROP CONSTRAINT IF EXISTS calendar_items_no_overlap;
ALTER TABLE calendar_items ADD CONSTRAINT calendar_items_no_overlap
  EXCLUDE USING gist (
    tstzrange(start_at, end_at, '[)') WITH &&
  ) WHERE (status <> 'cancelled');

DROP INDEX IF EXISTS goals_user_idx;
CREATE INDEX IF NOT EXISTS goals_status_idx ON goals (status);
DROP INDEX IF EXISTS calendar_items_range_idx;
CREATE INDEX IF NOT EXISTS calendar_items_range_idx ON calendar_items (start_at, end_at);
DROP INDEX IF EXISTS goal_sessions_goal_idx;
CREATE INDEX IF NOT EXISTS goal_sessions_goal_idx ON goal_sessions (goal_id, started_at);
DROP INDEX IF EXISTS plans_period_idx;
CREATE INDEX IF NOT EXISTS plans_period_idx ON weekly_plans (period_start, version_number);

DROP SCHEMA IF EXISTS auth CASCADE;
