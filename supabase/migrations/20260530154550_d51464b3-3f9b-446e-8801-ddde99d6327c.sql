-- Add comment and completed_source_type columns to workout_comparisons
ALTER TABLE public.workout_comparisons
  ADD COLUMN IF NOT EXISTS comment text,
  ADD COLUMN IF NOT EXISTS completed_source_type text NOT NULL DEFAULT 'IMPORTED_ACTIVITY';

-- Deduplicate any existing rows for the same (user, planned, completed) triple, keeping most recent
DELETE FROM public.workout_comparisons a
USING public.workout_comparisons b
WHERE a.user_id = b.user_id
  AND a.planned_workout_id = b.planned_workout_id
  AND a.completed_workout_id = b.completed_workout_id
  AND a.updated_at < b.updated_at;

-- Unique constraint required for ON CONFLICT upsert
ALTER TABLE public.workout_comparisons
  DROP CONSTRAINT IF EXISTS workout_comparisons_unique_pair;
ALTER TABLE public.workout_comparisons
  ADD CONSTRAINT workout_comparisons_unique_pair
  UNIQUE (user_id, planned_workout_id, completed_workout_id);