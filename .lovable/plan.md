# Stabilisation du data model

Objectif : aligner la base existante sur le modèle que tu as listé, sans casser le code actuel. La majorité existe déjà sous d'autres noms — je propose donc d'**ajouter les champs manquants** plutôt que de tout renommer (ça éviterait de réécrire tout le code training/calendar/upload).

## 1. `athlete_profiles` — ajouts

Manque :
- `sex` (enum `male | female | other`)
- `objective_type` (enum `5k | 10k | semi | marathon`) — défaut `10k`
- `objective_date` (date) — alias logique de `race_date` déjà présent ; je garde `race_date` et ajoute `objective_date` qui sera synchronisé, OU je renomme. **Reco : renommer `race_date` → `objective_date`** (un seul endroit dans le code).
- `weekly_sessions_target` (int) — déjà présent sous `sessions_per_week`. **Reco : garder `sessions_per_week`** (déjà câblé partout) et considérer `weekly_sessions_target` comme son nom métier.

Déjà OK : `id`, `name`, `age`, `vma_kmh`, `current_level` (≈ `current_fitness_level`).

## 2. `training_plans` — ajouts

Manque :
- `end_date` (date, calculé à partir de `start_date + duration_weeks`)
- `objective` (text, copie de l'objectif au moment de la création)
- `status` : déjà `plan_status` enum — vérifier qu'il contient `active | archived`.

## 3. `workouts` (= PlannedWorkout) — ajouts

Manque :
- `target_distance_km` (numeric)
- `target_duration_min` : déjà `estimated_duration_minutes` ✅
- `target_pace_min_km` : déjà `target_pace_min` / `target_pace_max` (range) ✅
- `target_hr_zone` (text, ex: "Z2", "Z4")
- `instructions` : déjà `objective + warmup + main_set + recovery + cooldown` ✅
- `status` : déjà OK (`PLANNED | COMPLETED | PARTIAL | MISSED | RESCHEDULED | REPLACED`) — `skipped | moved` mappent sur `MISSED | RESCHEDULED`.
- `workout_type` : enum actuel plus riche (VMA_SHORT, THRESHOLD…) qu'on garde ; pas de régression.

## 4. CompletedWorkout

Déjà couvert par **deux tables existantes** :
- `imported_activities` (source = `FILE_UPLOAD` ou maintenant `STRAVA_SYNC`) — données objectives.
- `workout_logs` — RPE / pain / fatigue / sommeil / notes liés à un workout planifié.
- Le lien planifié↔complété passe par `workout_activity_matches`.

Ajouts proposés :
- `imported_activities.source_type` enum : ajouter la valeur `STRAVA_SYNC` (déjà fait dans la migration Strava précédente — à vérifier).
- `imported_activities.perceived_effort` (int 1-10) — aujourd'hui le RPE vit dans `workout_logs` / `post_activity_feedback`. **Reco : ne rien dupliquer**, le RPE reste sur le feedback.

## 5. WorkoutComparison

**Nouvelle table** `workout_comparisons` :
- `planned_workout_id` (uuid, FK logique → workouts)
- `completed_workout_id` (uuid, FK logique → imported_activities)
- `distance_delta_km` (numeric)
- `pace_delta_sec_per_km` (int)
- `duration_delta_sec` (int)
- `status` enum `on_track | too_fast | too_slow | incomplete | overdone`
- `user_id`, timestamps

Aujourd'hui ces deltas sont calculés à la volée par `complianceScore()` dans `planned-vs-actual.tsx`. Les **persister** permet : historique, requêtes de tendance, dashboards.

## Migration unique

Un seul fichier SQL qui :
1. Ajoute les colonnes manquantes (`sex`, `objective_type`, `objective_date` en remplacement de `race_date`, `target_distance_km`, `target_hr_zone` sur `workouts`, `end_date` + `objective` sur `training_plans`).
2. Crée la table `workout_comparisons` + RLS + GRANTs.
3. Crée les enums (`sex`, `objective_type`, `comparison_status`).
4. Trigger pour remplir `workout_comparisons` automatiquement à la création d'un `workout_activity_matches` (optionnel — peut aussi rester côté server fn).

## Code à toucher après migration

- `src/lib/api/training.functions.ts` : profil onboarding (ajouter `sex`, `objective_type`).
- `src/routes/_authenticated/onboarding.tsx` : nouveaux champs UI.
- `src/lib/training/generator.ts` : utiliser `target_distance_km` quand fourni.
- `src/lib/api/activities.functions.ts` : écrire dans `workout_comparisons` après un match.

## Hors scope (à valider)

- Renommer `race_date` → `objective_date` casse `seed.ts`, `recalibration.ts`, dashboard. **Option A** : renommer + update code (propre). **Option B** : ajouter `objective_date` en alias et garder `race_date` (zéro risque).

---

**Avant que je lance la migration**, deux choix à confirmer :

1. **Renommer `race_date` → `objective_date`** (option A propre, ~10 fichiers touchés) OU **garder les deux** (option B, zéro casse) ?
2. **Persister `workout_comparisons`** maintenant, ou **garder le calcul à la volée** et juste ajouter les colonnes manquantes sur les autres tables ?
