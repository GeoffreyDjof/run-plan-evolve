
-- Enums
CREATE TYPE public.workout_type AS ENUM ('VMA_SHORT','VMA_LONG','THRESHOLD','TEN_K_PACE','EASY','LONG_RUN','RECOVERY','HILLS','TEST','TAPER','RACE');
CREATE TYPE public.workout_status AS ENUM ('PLANNED','COMPLETED','PARTIAL','MISSED','RESCHEDULED','REPLACED');
CREATE TYPE public.completion_status AS ENUM ('FULL','PARTIAL','NONE');
CREATE TYPE public.pain_level AS ENUM ('NONE','MILD','MODERATE','SEVERE');
CREATE TYPE public.fatigue_level AS ENUM ('LOW','NORMAL','HIGH');
CREATE TYPE public.sleep_quality AS ENUM ('GOOD','AVERAGE','POOR');
CREATE TYPE public.runner_level AS ENUM ('RETURNING','REGULAR','ADVANCED');
CREATE TYPE public.plan_status AS ENUM ('ACTIVE','COMPLETED','ARCHIVED');

-- athlete_profiles
CREATE TABLE public.athlete_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  age INT,
  vma_kmh NUMERIC(4,2) DEFAULT 14.0,
  target_10k_time TEXT,
  race_date DATE,
  sessions_per_week INT DEFAULT 3,
  preferred_days TEXT[] DEFAULT ARRAY['Tue','Thu','Sun'],
  current_level public.runner_level DEFAULT 'REGULAR',
  cross_training_available BOOLEAN DEFAULT false,
  onboarded BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- training_plans
CREATE TABLE public.training_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '12-Week 10K Plan',
  start_date DATE NOT NULL,
  race_date DATE NOT NULL,
  duration_weeks INT NOT NULL DEFAULT 12,
  current_week INT NOT NULL DEFAULT 1,
  status public.plan_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- workouts
CREATE TABLE public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.training_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_number INT NOT NULL,
  scheduled_date DATE NOT NULL,
  workout_type public.workout_type NOT NULL,
  title TEXT NOT NULL,
  objective TEXT,
  warmup TEXT,
  main_set TEXT,
  recovery TEXT,
  cooldown TEXT,
  target_vma_min_percent NUMERIC(5,2),
  target_vma_max_percent NUMERIC(5,2),
  target_pace_min TEXT,
  target_pace_max TEXT,
  estimated_duration_minutes INT,
  estimated_load INT,
  difficulty INT DEFAULT 3,
  status public.workout_status NOT NULL DEFAULT 'PLANNED',
  replaced_by_workout_id UUID REFERENCES public.workouts(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.workouts(user_id, scheduled_date);
CREATE INDEX ON public.workouts(plan_id, week_number);

-- workout_logs
CREATE TABLE public.workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_status public.completion_status NOT NULL DEFAULT 'FULL',
  actual_duration_minutes INT,
  actual_distance_km NUMERIC(5,2),
  average_pace TEXT,
  rpe INT,
  pain_level public.pain_level DEFAULT 'NONE',
  fatigue_level public.fatigue_level DEFAULT 'NORMAL',
  sleep_quality public.sleep_quality DEFAULT 'AVERAGE',
  comment TEXT,
  calculated_load INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.workout_logs(user_id, created_at DESC);

-- vma_tests
CREATE TABLE public.vma_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  test_type TEXT,
  distance_meters INT,
  duration_minutes NUMERIC(5,2),
  estimated_vma_kmh NUMERIC(4,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.athlete_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vma_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own profile" ON public.athlete_profiles FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own plans" ON public.training_plans FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own workouts" ON public.workouts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own logs" ON public.workout_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own vma tests" ON public.vma_tests FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.athlete_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_workouts_updated BEFORE UPDATE ON public.workouts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- auto-create athlete_profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.athlete_profiles (user_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
