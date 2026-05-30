-- Enums
DO $$ BEGIN
  CREATE TYPE public.sex_type AS ENUM ('male', 'female', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.objective_type AS ENUM ('5k', '10k', 'semi', 'marathon');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.comparison_status AS ENUM ('on_track', 'too_fast', 'too_slow', 'incomplete', 'overdone');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Ajout valeur STRAVA_SYNC si absente
DO $$ BEGIN
  ALTER TYPE public.activity_source_type ADD VALUE IF NOT EXISTS 'STRAVA_SYNC';
EXCEPTION WHEN others THEN NULL; END $$;

-- athlete_profiles : ajouts
ALTER TABLE public.athlete_profiles
  ADD COLUMN IF NOT EXISTS sex public.sex_type,
  ADD COLUMN IF NOT EXISTS objective_type public.objective_type NOT NULL DEFAULT '10k',
  ADD COLUMN IF NOT EXISTS objective_date date;

-- Backfill objective_date depuis race_date si présent
UPDATE public.athlete_profiles
SET objective_date = race_date
WHERE objective_date IS NULL AND race_date IS NOT NULL;

-- training_plans : ajouts
ALTER TABLE public.training_plans
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS objective text;

UPDATE public.training_plans
SET end_date = start_date + (duration_weeks * 7)
WHERE end_date IS NULL;

-- workouts : ajouts
ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS target_distance_km numeric,
  ADD COLUMN IF NOT EXISTS target_hr_zone text;

-- workout_comparisons
CREATE TABLE IF NOT EXISTS public.workout_comparisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  planned_workout_id uuid NOT NULL,
  completed_workout_id uuid NOT NULL,
  distance_delta_km numeric,
  pace_delta_sec_per_km integer,
  duration_delta_sec integer,
  status public.comparison_status NOT NULL DEFAULT 'on_track',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (planned_workout_id, completed_workout_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_comparisons TO authenticated;
GRANT ALL ON public.workout_comparisons TO service_role;

ALTER TABLE public.workout_comparisons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own comparisons"
ON public.workout_comparisons
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_updated_at_workout_comparisons
BEFORE UPDATE ON public.workout_comparisons
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_workout_comparisons_user ON public.workout_comparisons(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_comparisons_planned ON public.workout_comparisons(planned_workout_id);