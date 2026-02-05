/**
 * Import de l'historique des séances Hercules pour Caro
 *
 * Ce script:
 * 1. Lit les performances de la base SQLite Hercules
 * 2. Groupe les performances par date+session pour créer des WorkoutSession
 * 3. Crée les SessionExercise et SessionSet correspondants
 *
 * Pas de date cutoff — on importe TOUT l'historique (404 séances, 2018-2025)
 *
 * Prérequis: exécuter import-exercises et import-workouts d'abord
 *
 * Usage: npx tsx scripts/hercules-caro-import-history.ts
 */

import * as fs from "fs";
import * as path from "path";
import initSqlJs, { Database } from "sql.js";
import { Pool } from "pg";

// Configuration
const HERCULES_DB_PATH = path.join(__dirname, "../docs/features/Hercule_Caro.db");
const EXERCISE_MAPPING_PATH = path.join(__dirname, "hercules-caro-exercise-mapping.json");
const WORKOUT_MAPPING_PATH = path.join(__dirname, "hercules-caro-workout-mapping.json");

const DATABASE_URL =
  process.env["DATABASE_URL"] || "postgresql://momentum:momentum_dev@localhost:5432/momentum";

const USER_EMAIL = "caro.sacre@gmail.com";

// Pas de performances à ignorer pour Caro

interface ExerciseMappingEntry {
  herculesId: string;
  herculesName: string;
  momentumId: string;
  momentumName: string;
  action: string;
}

interface WorkoutMappingEntry {
  herculesId: string;
  herculesName: string;
  momentumId: string;
  momentumName: string;
  itemCount: number;
  exerciseCount: number;
}

interface HerculesPerformance {
  id: string;
  date: number;
  sessionDuration: number;
  sessionId: string;
  exerciseId: string;
  position: number;
  repsGoal: string;
  repsDone: string;
  loadsGoal: string;
  loadsDone: string;
  idSuperset: number;
}

interface HerculesSessionNote {
  sessionId: string;
  date: number;
  note: string;
}

async function main() {
  console.log("=== Import de l'historique Hercules — CARO ===\n");
  console.log(`Database: ${DATABASE_URL.replace(/:[^:@]+@/, ":***@")}`);
  console.log(`Hercules DB: ${HERCULES_DB_PATH}\n`);

  // Load mappings
  if (!fs.existsSync(EXERCISE_MAPPING_PATH)) {
    throw new Error(`Exercise mapping not found: ${EXERCISE_MAPPING_PATH}\nRun exercise import first.`);
  }
  if (!fs.existsSync(WORKOUT_MAPPING_PATH)) {
    throw new Error(`Workout mapping not found: ${WORKOUT_MAPPING_PATH}\nRun workout import first.`);
  }

  const exerciseMapping: Record<string, ExerciseMappingEntry> = JSON.parse(
    fs.readFileSync(EXERCISE_MAPPING_PATH, "utf-8")
  );
  const workoutMapping: Record<string, WorkoutMappingEntry> = JSON.parse(
    fs.readFileSync(WORKOUT_MAPPING_PATH, "utf-8")
  );

  console.log(`Loaded exercise mapping: ${Object.keys(exerciseMapping).length} exercises`);
  console.log(`Loaded workout mapping: ${Object.keys(workoutMapping).length} workouts\n`);

  const SQL = await initSqlJs();
  const herculesDbBuffer = fs.readFileSync(HERCULES_DB_PATH);
  const herculesDb: Database = new SQL.Database(herculesDbBuffer);

  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    // Get user ID
    const userResult = await pool.query("SELECT id FROM users WHERE email = $1", [USER_EMAIL]);
    if (!userResult.rows.length) {
      throw new Error(`User not found: ${USER_EMAIL}`);
    }
    const userId = userResult.rows[0].id;
    console.log(`Using user ID: ${userId}\n`);

    // 1. Get all performances
    console.log("1. Lecture des performances Hercules...");
    const performances = getHerculesPerformances(herculesDb);
    console.log(`   → ${performances.length} performances trouvées\n`);

    // 2. Get session notes
    console.log("2. Lecture des notes de session...");
    const sessionNotes = getHerculesSessionNotes(herculesDb);
    const notesByDateSession = new Map<string, string>();
    for (const note of sessionNotes) {
      const key = `${note.date}-${note.sessionId}`;
      notesByDateSession.set(key, note.note);
    }
    console.log(`   → ${sessionNotes.length} notes trouvées\n`);

    // 3. Group performances by date+session
    console.log("3. Regroupement des performances par séance...");
    const sessionGroups = new Map<string, HerculesPerformance[]>();
    for (const perf of performances) {
      const key = `${perf.date}-${perf.sessionId}`;
      if (!sessionGroups.has(key)) {
        sessionGroups.set(key, []);
      }
      sessionGroups.get(key)!.push(perf);
    }
    console.log(`   → ${sessionGroups.size} séances à importer\n`);

    // 4. Process each session group
    console.log("4. Import des séances...\n");
    let sessionsCreated = 0;
    let sessionsSkipped = 0;
    let exercisesCreated = 0;
    let exercisesSkipped = 0;
    let setsCreated = 0;

    const sortedKeys = Array.from(sessionGroups.keys()).sort((a, b) => {
      const dateA = parseInt(a.split("-")[0]);
      const dateB = parseInt(b.split("-")[0]);
      return dateA - dateB;
    });

    for (const key of sortedKeys) {
      const perfs = sessionGroups.get(key)!;
      const firstPerf = perfs[0];
      const herculesSessionId = firstPerf.sessionId;

      // Get workout mapping
      const workoutMap = workoutMapping[herculesSessionId];
      if (!workoutMap) {
        console.log(`   ⚠️  Skip: Session Hercules ${herculesSessionId} pas dans le mapping`);
        sessionsSkipped++;
        continue;
      }

      const sessionDate = new Date(firstPerf.date);
      const dateStr = sessionDate.toLocaleDateString("fr-FR");

      // Check if session already exists (idempotent)
      const existingSession = await pool.query(
        `SELECT id FROM workout_sessions
         WHERE user_id = $1 AND workout_id = $2
         AND started_at >= $3 AND started_at < $4`,
        [
          userId,
          workoutMap.momentumId,
          new Date(firstPerf.date - 60000),
          new Date(firstPerf.date + 60000),
        ]
      );

      if (existingSession.rows.length > 0) {
        console.log(`   ✅ Existe: ${workoutMap.momentumName} - ${dateStr}`);
        sessionsSkipped++;
        continue;
      }

      // Get notes
      const noteKey = `${firstPerf.date}-${herculesSessionId}`;
      const notes = notesByDateSession.get(noteKey) || null;

      // Calculate completedAt
      const completedAt = new Date(firstPerf.date + firstPerf.sessionDuration * 1000);

      // Create workout session
      const sessionResult = await pool.query(
        `INSERT INTO workout_sessions (id, user_id, workout_id, status, started_at, completed_at, notes)
         VALUES (gen_random_uuid(), $1, $2, 'completed', $3, $4, $5)
         RETURNING id`,
        [userId, workoutMap.momentumId, sessionDate, completedAt, notes]
      );
      const sessionId = sessionResult.rows[0].id;
      sessionsCreated++;

      // Sort performances by position
      perfs.sort((a, b) => a.position - b.position);

      let sessionExerciseCount = 0;
      let sessionSetCount = 0;

      for (const perf of perfs) {
        // Get exercise mapping
        const exerciseMap = exerciseMapping[perf.exerciseId];
        if (!exerciseMap) {
          exercisesSkipped++;
          continue;
        }

        // Find the corresponding WorkoutItemExercise
        const workoutItemExercise = await pool.query(
          `SELECT wie.id, wi.id as workout_item_id
           FROM workout_item_exercises wie
           JOIN workout_items wi ON wi.id = wie.workout_item_id
           WHERE wi.workout_id = $1 AND wie.exercise_id = $2
           LIMIT 1`,
          [workoutMap.momentumId, exerciseMap.momentumId]
        );

        const workoutItemExerciseId =
          workoutItemExercise.rows.length > 0 ? workoutItemExercise.rows[0].id : null;
        const workoutItemId =
          workoutItemExercise.rows.length > 0 ? workoutItemExercise.rows[0].workout_item_id : null;

        // Create session exercise
        const sessionExerciseResult = await pool.query(
          `INSERT INTO session_exercises (id, session_id, workout_item_exercise_id, exercise_id, status, position, workout_item_id)
           VALUES (gen_random_uuid(), $1, $2, $3, 'completed', $4, $5)
           RETURNING id`,
          [sessionId, workoutItemExerciseId, exerciseMap.momentumId, perf.position, workoutItemId]
        );
        const sessionExerciseId = sessionExerciseResult.rows[0].id;
        sessionExerciseCount++;
        exercisesCreated++;

        // Parse reps and loads
        const repsGoal = parseHerculesArray(perf.repsGoal);
        const repsDone = parseHerculesArray(perf.repsDone);
        const loadsGoal = parseHerculesArray(perf.loadsGoal);
        const loadsDone = parseHerculesArray(perf.loadsDone);
        const numSets = Math.max(repsGoal.length, repsDone.length, loadsGoal.length, loadsDone.length);

        for (let i = 0; i < numSets; i++) {
          const targetReps = repsGoal[i] || repsDone[i] || 10;
          const targetWeight = loadsGoal[i] ?? loadsDone[i] ?? null;
          const actualReps = repsDone[i] ?? null;
          const actualWeight = loadsDone[i] ?? null;

          await pool.query(
            `INSERT INTO session_sets (id, session_exercise_id, set_number, target_reps, target_weight, actual_reps, actual_weight, completed_at)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)`,
            [
              sessionExerciseId,
              i + 1,
              targetReps,
              targetWeight !== null && targetWeight > 0 ? targetWeight : null,
              actualReps,
              actualWeight !== null && actualWeight > 0 ? actualWeight : null,
              completedAt,
            ]
          );
          sessionSetCount++;
          setsCreated++;
        }
      }

      console.log(
        `   📝 ${workoutMap.momentumName} - ${dateStr}: ${sessionExerciseCount} exercices, ${sessionSetCount} sets${notes ? " (avec notes)" : ""}`
      );
    }

    // Summary
    console.log("\n=== Résumé ===");
    console.log(`   Sessions créées:   ${sessionsCreated}`);
    console.log(`   Sessions ignorées: ${sessionsSkipped}`);
    console.log(`   Exercices créés:   ${exercisesCreated}`);
    console.log(`   Exercices ignorés: ${exercisesSkipped}`);
    console.log(`   Sets créés:        ${setsCreated}`);
    console.log("\n✅ Import terminé avec succès!");
  } finally {
    herculesDb.close();
    await pool.end();
  }
}

function getHerculesPerformances(db: Database): HerculesPerformance[] {
  // No date cutoff — import everything
  const result = db.exec(`
    SELECT
      CAST(p._id AS TEXT) as id,
      p.date,
      COALESCE(p.session_duration, 0) as session_duration,
      CAST(p.id_session AS TEXT) as id_session,
      CAST(p.id_exercise AS TEXT) as id_exercise,
      p.position,
      COALESCE(p.reps_goal, '') as reps_goal,
      COALESCE(p.reps_done, '') as reps_done,
      COALESCE(p.loads_goal, '') as loads_goal,
      COALESCE(p.loads_done, '') as loads_done,
      COALESCE(p.id_superset, 0) as id_superset
    FROM performances p
    ORDER BY p.date, p.id_session, p.position
  `);

  if (!result.length) return [];

  const columns = result[0].columns;
  const values = result[0].values;

  return values.map((row) => ({
    id: row[columns.indexOf("id")] as string,
    date: row[columns.indexOf("date")] as number,
    sessionDuration: row[columns.indexOf("session_duration")] as number,
    sessionId: row[columns.indexOf("id_session")] as string,
    exerciseId: row[columns.indexOf("id_exercise")] as string,
    position: row[columns.indexOf("position")] as number,
    repsGoal: row[columns.indexOf("reps_goal")] as string,
    repsDone: row[columns.indexOf("reps_done")] as string,
    loadsGoal: row[columns.indexOf("loads_goal")] as string,
    loadsDone: row[columns.indexOf("loads_done")] as string,
    idSuperset: row[columns.indexOf("id_superset")] as number,
  }));
}

function getHerculesSessionNotes(db: Database): HerculesSessionNote[] {
  const result = db.exec(`
    SELECT
      CAST(id_session AS TEXT) as id_session,
      date,
      note
    FROM sessions_notes
    ORDER BY date
  `);

  if (!result.length) return [];

  const columns = result[0].columns;
  const values = result[0].values;

  return values.map((row) => ({
    sessionId: row[columns.indexOf("id_session")] as string,
    date: row[columns.indexOf("date")] as number,
    note: row[columns.indexOf("note")] as string,
  }));
}

function parseHerculesArray(str: string | null): number[] {
  if (!str) return [];
  return str
    .split("-")
    .map((v) => parseFloat(v.trim()))
    .filter((v) => !isNaN(v));
}

main().catch((error) => {
  console.error("Erreur:", error);
  process.exit(1);
});
