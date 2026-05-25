# 10K Training Coach — MVP Plan

A mobile-first, dark-mode running coach app built on React + TypeScript + TanStack Start + Lovable Cloud (Supabase). Single-user friendly, multi-user ready.

## 1. Backend (Lovable Cloud)

Enable Lovable Cloud, then create these tables with RLS (`user_id = auth.uid()` on all owned rows).

- `athlete_profiles` — vma_kmh, target_10k_time, race_date, sessions_per_week, preferred_days (text[]), current_level, cross_training_available
- `training_plans` — name, start_date, race_date, duration_weeks, current_week, status
- `workouts` — plan_id, week_number, scheduled_date, workout_type (enum), title, objective, warmup, main_set, recovery, cooldown, target_vma_min/max_percent, target_pace_min/max, estimated_duration_minutes, estimated_load, difficulty, status (enum), replaced_by_workout_id, notes
- `workout_logs` — workout_id, completed_status, actual_duration_minutes, actual_distance_km, average_pace, rpe, pain_level, fatigue_level, sleep_quality, comment, calculated_load
- `vma_tests` — date, test_type, distance_meters, duration_minutes, estimated_vma_kmh, notes

Enums: `workout_type`, `workout_status` (PLANNED/COMPLETED/PARTIAL/MISSED/RESCHEDULED/REPLACED).

User name/age live on `athlete_profiles` (avoid duplicating `auth.users`). Trigger: auto-create empty profile on signup.

## 2. Auth

Email/password + Google OAuth via Lovable broker. `_authenticated` layout guard. `/login`, `/onboarding`, then app routes.

## 3. Core training logic (`src/lib/training/`)

- `paceFromVMA(vma, pct)` → `{ kmh, paceStr: "m:ss/km" }`
- `estimateWorkoutLoad(minutes, rpe)` → minutes × rpe
- `PACE_ZONES` constant for EASY/STEADY/THRESHOLD/TEN_K_PACE/VMA_LONG/VMA_SHORT with min/max % VMA
- `seedPlan(profile)` — generates the full 12-week schedule from the spec, placing workouts on `preferred_days`, with recovery weeks 4 & 8 and taper week 12
- `equivalentWorkouts(workout)` — returns same-family alternatives with comparable load
- `generateWorkout({ type, availableTime, difficulty, terrain, monotony, week, vma })` — builds warmup/main/recovery/cooldown, paces, load, explanation
- `safetyChecks(plan, logs)` — weekly load >+15%, hard back-to-back, high pain/fatigue before VMA/threshold; returns toast-ready warnings

## 4. Routes (TanStack Start, file-based)

```
src/routes/
  __root.tsx
  index.tsx                      → redirect to /dashboard or /login
  login.tsx
  _authenticated.tsx             → auth guard
  _authenticated/
    onboarding.tsx               → multi-step form, seeds plan on submit
    dashboard.tsx                → today/next workout + week summary + warnings
    calendar.tsx                 → 12-week grid, drag-to-reschedule
    workout.$id.tsx              → detail + actions
    progress.tsx                 → load chart, completion stats, predicted 10K
    generator.tsx                → custom workout builder + preview/confirm
    settings.tsx                 → VMA, days, race date, reset/export plan
```

Each route uses `createServerFn` + `requireSupabaseAuth` for reads/writes, wrapped with TanStack Query (`ensureQueryData` in loader, `useSuspenseQuery` in component).

## 5. Key components

- `WorkoutCard` — type badge, status chip, pace, duration
- `WorkoutTypeBadge`, `StatusChip`, `PaceDisplay`
- `WeekStrip` (dashboard) and `CalendarGrid` (12 weeks × 7 days)
- `CompletionLogDrawer` — yes/partial/no, duration, distance, pace, RPE slider, pain, fatigue, sleep, comment
- `ReplaceWorkoutDialog` — side-by-side original vs replacement + load delta + reasoning
- `GenerateWorkoutDialog` — form + preview with reasoning bullets
- `RescheduleDialog` — date picker + conflict warnings
- `LoadChart` (Recharts) — weekly load bars + planned vs completed
- `WarningBanner` (sonner toasts for transient, banner for persistent)

## 6. Design system (`src/styles.css`)

Dark by default. Neon green accent (`oklch(0.85 0.2 145)`) as primary, deep near-black background, elevated card surface, subtle borders. Large touch targets (min 44px). Inter for body, tabular nums for paces/times. Tokens only — no hardcoded colors in components.

## 7. Seed data

`seedPlan()` writes the full 12-week workout list (exact sets from spec) to `workouts` when onboarding completes, scheduled across the user's preferred days starting Monday of next week, with race day on `race_date`. Default VMA fallback 14 km/h.

## 8. MVP scope

Auth → onboarding → seeded plan → dashboard → calendar → workout detail → complete/reschedule/replace → generator → progress. No social, payments, integrations.

---

### Technical notes
- Strong typing: shared `WorkoutType`/`WorkoutStatus` unions mirror DB enums; Zod validators on all server fn inputs.
- All mutations invalidate the relevant TanStack Query keys; `onAuthStateChange` invalidates everything at root.
- Drag-and-drop in calendar via `@dnd-kit/core` (lightweight, Worker-safe).
- Pace math is pure and unit-tested via a small `__tests__` file if needed.
- No paid APIs; predicted 10K time computed from current VMA via Mercier-style formula, shown with a "rough estimate" caveat.
