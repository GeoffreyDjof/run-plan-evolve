
-- Enums
CREATE TYPE public.activity_source_type AS ENUM ('FILE_UPLOAD', 'MANUAL_ENTRY');
CREATE TYPE public.activity_file_type AS ENUM ('FIT', 'GPX', 'TCX', 'CSV', 'UNKNOWN');
CREATE TYPE public.activity_kind AS ENUM ('RUN', 'RIDE', 'WALK', 'STRENGTH', 'OTHER');
CREATE TYPE public.file_parsing_status AS ENUM ('PENDING', 'PARSED', 'FAILED', 'UNSUPPORTED');
CREATE TYPE public.match_status AS ENUM ('AUTO_MATCHED', 'MANUALLY_MATCHED', 'REJECTED', 'NEEDS_REVIEW');

-- imported_activities
CREATE TABLE public.imported_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  source_type activity_source_type NOT NULL DEFAULT 'FILE_UPLOAD',
  original_filename TEXT,
  file_type activity_file_type NOT NULL DEFAULT 'UNKNOWN',
  activity_type activity_kind NOT NULL DEFAULT 'RUN',
  start_time TIMESTAMPTZ NOT NULL,
  timezone TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  moving_time_seconds INTEGER,
  distance_meters NUMERIC NOT NULL DEFAULT 0,
  average_pace_sec_per_km INTEGER,
  average_speed_kmh NUMERIC,
  average_heart_rate INTEGER,
  max_heart_rate INTEGER,
  elevation_gain_meters NUMERIC,
  average_cadence INTEGER,
  calories INTEGER,
  raw_summary JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.imported_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own activities" ON public.imported_activities FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_imp_act_user_date ON public.imported_activities(user_id, start_time DESC);

-- activity_splits
CREATE TABLE public.activity_splits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  imported_activity_id UUID NOT NULL REFERENCES public.imported_activities(id) ON DELETE CASCADE,
  split_index INTEGER NOT NULL,
  distance_meters NUMERIC NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  average_pace_sec_per_km INTEGER,
  average_heart_rate INTEGER,
  elevation_gain_meters NUMERIC
);
ALTER TABLE public.activity_splits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own splits" ON public.activity_splits FOR ALL
  USING (EXISTS (SELECT 1 FROM public.imported_activities a WHERE a.id = imported_activity_id AND a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.imported_activities a WHERE a.id = imported_activity_id AND a.user_id = auth.uid()));
CREATE INDEX idx_splits_act ON public.activity_splits(imported_activity_id, split_index);

-- uploaded_activity_files
CREATE TABLE public.uploaded_activity_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  imported_activity_id UUID REFERENCES public.imported_activities(id) ON DELETE SET NULL,
  original_filename TEXT NOT NULL,
  file_type activity_file_type NOT NULL DEFAULT 'UNKNOWN',
  file_size_bytes INTEGER NOT NULL DEFAULT 0,
  storage_path TEXT,
  parsing_status file_parsing_status NOT NULL DEFAULT 'PENDING',
  parsing_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.uploaded_activity_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own files" ON public.uploaded_activity_files FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- workout_activity_matches
CREATE TABLE public.workout_activity_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  imported_activity_id UUID NOT NULL REFERENCES public.imported_activities(id) ON DELETE CASCADE,
  match_status match_status NOT NULL DEFAULT 'NEEDS_REVIEW',
  confidence_score INTEGER NOT NULL DEFAULT 0,
  match_reason TEXT,
  distance_score INTEGER NOT NULL DEFAULT 0,
  time_score INTEGER NOT NULL DEFAULT 0,
  type_score INTEGER NOT NULL DEFAULT 0,
  intensity_score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workout_id, imported_activity_id)
);
ALTER TABLE public.workout_activity_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own matches" ON public.workout_activity_matches FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_matches_user ON public.workout_activity_matches(user_id, workout_id);
CREATE INDEX idx_matches_act ON public.workout_activity_matches(imported_activity_id);

-- post_activity_feedback
CREATE TABLE public.post_activity_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  imported_activity_id UUID NOT NULL REFERENCES public.imported_activities(id) ON DELETE CASCADE,
  workout_id UUID REFERENCES public.workouts(id) ON DELETE SET NULL,
  rpe INTEGER,
  pain_level pain_level,
  fatigue_level fatigue_level,
  sleep_quality sleep_quality,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.post_activity_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own feedback" ON public.post_activity_feedback FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at triggers
CREATE TRIGGER set_updated_at_imp_act BEFORE UPDATE ON public.imported_activities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_matches BEFORE UPDATE ON public.workout_activity_matches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage bucket (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('activity-files', 'activity-files', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users read own activity files" ON storage.objects FOR SELECT
  USING (bucket_id = 'activity-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users upload own activity files" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'activity-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own activity files" ON storage.objects FOR UPDATE
  USING (bucket_id = 'activity-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own activity files" ON storage.objects FOR DELETE
  USING (bucket_id = 'activity-files' AND auth.uid()::text = (storage.foldername(name))[1]);
