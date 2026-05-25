# Manual Activity Upload & Matching

No Garmin/Strava/OAuth code exists in the project today, so nothing to remove. The Google sign-in on `/login` is unrelated and stays. This plan is purely additive.

## 1. Database (single migration)

New tables, all RLS-locked to `auth.uid() = user_id`:

- `imported_activities` — parsed activity summary (all fields per spec, `raw_summary jsonb`).
- `activity_splits` — per-split rows, FK by `imported_activity_id`.
- `uploaded_activity_files` — upload record + parsing status (`PENDING|PARSED|FAILED|UNSUPPORTED`).
- `workout_activity_matches` — scored match between a workout and an activity.
- `post_activity_feedback` — RPE/pain/fatigue/sleep/comment tied to an activity (+ optional workout).

Plus a private Storage bucket `activity-files` with per-user-folder RLS (`{user_id}/...`).

No `access_token`, `refresh_token`, `client_secret`, `provider_user_id`, or webhook columns anywhere.

## 2. Parsers (`src/lib/activities/`)

Pure TS, run client-side (no server upload needed for parsing — file is read in the browser, summary shown, then persisted):

- `gpx.ts` — DOMParser on trackpoints: distance via haversine, duration from timestamps, elevation gain (positive deltas), pace.
- `tcx.ts` — DOMParser on `Activity/Lap/Track/Trackpoint`: distance, duration, HR, cadence, splits per lap.
- `csv.ts` — header-driven (`date,activity_type,distance_km,duration,average_heart_rate,max_heart_rate,elevation_gain_meters`).
- `fit.ts` — interface + clear `UNSUPPORTED` return ("FIT parsing is prepared but not enabled yet. Please upload GPX or TCX for now."). No fake values.
- `detect.ts` — pick parser by extension; `index.ts` exports `parseActivityFile(file): Promise<ParsedActivity>`.

## 3. Matching engine (`src/lib/activities/matching.ts`)

Pure function `scoreMatch(workout, activity) → { type_score, date_score, duration_score, intensity_score, confidence }` using the spec's rules. Server fn `matchActivity` runs candidates across same-day ±1 ±2, returns ranked list, persists best as `AUTO_MATCHED` (≥80), `NEEDS_REVIEW` (50–79), or leaves unmatched (<50). Always shows confirmation in UI.

`compliance.ts` computes the 0–100 compliance score with the EASY-RPE leniency and hard-without-splits low-confidence rules.

## 4. Server functions (`src/lib/api/activities.functions.ts`)

All `requireSupabaseAuth`-protected:

- `saveParsedActivity({ parsed, filename, fileType })` — inserts `imported_activities`, `activity_splits`, links `uploaded_activity_files`.
- `saveAndMatchActivity(...)` — above + runs matcher + writes `workout_activity_matches`.
- `manuallyMatch({ activityId, workoutId })` / `unmatch({ matchId })`.
- `saveFeedback({ activityId, workoutId?, rpe, pain, fatigue, sleep, comment })`.
- `listActivities()`, `getActivity(id)`, `getPlannedVsActual(weekNumber?)`.

## 5. UI

- New route `/_authenticated/upload.tsx` — drag-and-drop + file picker (accept `.fit,.gpx,.tcx,.csv`), parsing status, parsed-summary preview, manual-correction form (activity type, date/time, distance, duration, avg/max HR, elevation, RPE, pain, fatigue, comment), three buttons: **Save**, **Save & match**, **Cancel**. Privacy note at bottom: *"Files are only imported when you manually upload them. No Garmin, Strava, OAuth, tokens, or external sync are used."*
- New route `/_authenticated/activities.tsx` — list of imported activities with match status badges.
- New route `/_authenticated/planned-vs-actual.tsx` — per-workout planned vs actual table with compliance score.
- **Dashboard** additions: latest uploaded activity card, unmatched count, needs-review count, weekly actual distance/duration/RPE-load tile.
- **Calendar**: workout cards get `MatchedBadge`, `NeedsReviewBadge`, or `UnmatchedActivityDot`.
- Nav link to "Upload" in the auth shell.

## 6. Safety engine update (`src/lib/training/rules.ts` + `safety.ts`)

Extend `evaluatePlan` to also pull actual data:
- `+15% actual weekly load vs prev actual week` → WARNING.
- Moderate/severe pain in `post_activity_feedback` → recommend downgrading next hard workout (uses existing `recalibration.ts`).
- Easy planned workout but matched activity RPE ≥ 8 → WARNING ("unexpectedly high RPE on easy run").
- Two hard *actual* sessions within 48 h (from matched activities of hard workouts) → WARNING.

## Out of scope (call out, don't build)

- Real FIT decoding — stubbed only.
- Server-side re-parsing of uploaded files (parsing happens client-side; file stored for audit).
- Background re-matching when new workouts are added.

## Technical notes

- Storage bucket policies: `bucket_id = 'activity-files' AND auth.uid()::text = (storage.foldername(name))[1]` for all of SELECT/INSERT/UPDATE/DELETE.
- Haversine in `lib/activities/geo.ts`; pace formatter reused from existing `lib/training/paces.ts` where possible.
- Zod schemas for every server fn input.
- No new npm dependencies needed (DOMParser is built in; CSV parsed with a small custom splitter).

Shall I proceed end-to-end, or trim/reorder (e.g., ship upload+parse+match first, planned-vs-actual + safety updates in a follow-up)?
