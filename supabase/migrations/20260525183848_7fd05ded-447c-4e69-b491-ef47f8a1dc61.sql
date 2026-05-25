UPDATE public.workouts
SET scheduled_date = scheduled_date - INTERVAL '21 days'
WHERE plan_id = 'df5fcf05-2e4c-4106-8de4-55634556ef18'
  AND workout_type <> 'RACE';

UPDATE public.training_plans
SET start_date = '2026-05-25'
WHERE id = 'df5fcf05-2e4c-4106-8de4-55634556ef18';