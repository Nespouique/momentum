/**
 * Import des Workouts (Programmes) Hercules pour Caro
 *
 * Ce script:
 * 1. Lit les sessions et session_exercises de la base SQLite Hercules
 * 2. Crée les Workouts dans Momentum avec leur structure
 * 3. Génère un fichier de mapping hercules-session-id → momentum-workout-id
 *
 * Prérequis: exécuter hercules-caro-import-exercises.ts d'abord
 *
 * Usage: npx tsx scripts/hercules-caro-import-workouts.ts
 */

import * as fs from "fs";
import * as path from "path";
import initSqlJs, { Database } from "sql.js";
import { Pool } from "pg";

// Configuration
const HERCULES_DB_PATH = path.join(__dirname, "../docs/features/Hercule_Caro.db");
const EXERCISE_MAPPING_PATH = path.join(__dirname, "hercules-caro-exercise-mapping.json");
const OUTPUT_MAPPING_PATH = path.join(__dirname, "hercules-caro-workout-mapping.json");

const DATABASE_URL =
  process.env["DATABASE_URL"] || "postgresql://momentum:momentum_dev@localhost:5432/momentum";

const USER_EMAIL = "caro.sacre@gmail.com";

// Pas de sessions à ignorer — on importe toutes les sessions utilisées

interface ExerciseMappingEntry {
  herculesId: string;
  herculesName: string;
  momentumId: string;
  momentumName: string;
  action: string;
}

interface HerculesSession {
  id: string;
  name: string;
  description: string;
}

interface HerculesSessionExercise {
  id: string;
  sessionId: string;
  exerciseId: string;
  position: number;
  idSuperset: number;
  nbReps: string;
  loads: string;
  nbSets: number;
  restTimeBetweenSets: string;
  restTimeEndOfExercise: number;
}

interface WorkoutMappingEntry {
  herculesId: string;
  herculesName: string;
  momentumId: string;
  momentumName: string;
  itemCount: number;
  exerciseCount: number;
}

async function main() {
  console.log("=== Import des Workouts Hercules — CARO ===\n");
  console.log(`Database: ${DATABASE_URL.replace(/:[^:@]+@/, ":***@")}`);
  console.log(`Hercules DB: ${HERCULES_DB_PATH}\n`);

  // Load exercise mapping
  if (!fs.existsSync(EXERCISE_MAPPING_PATH)) {
    throw new Error(`Exercise mapping not found: ${EXERCISE_MAPPING_PATH}\nRun exercise import first.`);
  }
  const exerciseMapping: Record<string, ExerciseMappingEntry> = JSON.parse(
    fs.readFileSync(EXERCISE_MAPPING_PATH, "utf-8")
  );
  console.log(`Loaded exercise mapping: ${Object.keys(exerciseMapping).length} exercises\n`);

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

    // 1. Get Hercules sessions that have performances (used sessions only)
    console.log("1. Lecture des sessions Hercules utilisées...");
    const sessions = getUsedHerculesSessions(herculesDb);
    console.log(`   → ${sessions.length} sessions trouvées\n`);

    // 2. Process each session
    console.log("2. Traitement des sessions...\n");
    const workoutMapping: Record<string, WorkoutMappingEntry> = {};
    let created = 0;
    let existing = 0;

    for (const session of sessions) {
      const trimmedName = session.name.trim();

      // Check if workout already exists (idempotent)
      const existingWorkout = await pool.query(
        "SELECT id FROM workouts WHERE user_id = $1 AND name = $2",
        [userId, trimmedName]
      );

      if (existingWorkout.rows.length > 0) {
        const workoutId = existingWorkout.rows[0].id;
        const itemCount = await pool.query(
          "SELECT COUNT(*) FROM workout_items WHERE workout_id = $1",
          [workoutId]
        );
        workoutMapping[session.id] = {
          herculesId: session.id,
          herculesName: trimmedName,
          momentumId: workoutId,
          momentumName: trimmedName,
          itemCount: parseInt(itemCount.rows[0].count),
          exerciseCount: 0,
        };
        console.log(`   ✅ EXISTE: ${trimmedName}`);
        existing++;
        continue;
      }

      // Get session exercises
      const sessionExercises = getHerculesSessionExercises(herculesDb, session.id);
      console.log(`   📝 ${trimmedName} (${sessionExercises.length} exercices)`);

      // Create workout
      const workout = await createWorkout(
        pool,
        userId,
        trimmedName,
        session.description,
        sessionExercises,
        exerciseMapping
      );

      workoutMapping[session.id] = {
        herculesId: session.id,
        herculesName: trimmedName,
        momentumId: workout.id,
        momentumName: trimmedName,
        itemCount: workout.itemCount,
        exerciseCount: workout.exerciseCount,
      };
      console.log(
        `      → Créé: ${workout.itemCount} items, ${workout.exerciseCount} exercices, ${workout.setCount} sets`
      );
      created++;
    }

    // 3. Save mapping to JSON
    console.log("\n3. Sauvegarde du fichier de mapping...");
    fs.writeFileSync(OUTPUT_MAPPING_PATH, JSON.stringify(workoutMapping, null, 2));
    console.log(`   → ${OUTPUT_MAPPING_PATH}\n`);

    // Summary
    console.log("=== Résumé ===");
    console.log(`   Créés:    ${created}`);
    console.log(`   Existants: ${existing}`);
    console.log(`   Total:    ${Object.keys(workoutMapping).length} dans le mapping\n`);

    console.log("✅ Import terminé avec succès!");
  } finally {
    herculesDb.close();
    await pool.end();
  }
}

function getUsedHerculesSessions(db: Database): HerculesSession[] {
  // Only sessions that have at least one performance
  const result = db.exec(`
    SELECT DISTINCT CAST(s._id AS TEXT) as id, s.name, COALESCE(s.description, '') as description
    FROM sessions s
    INNER JOIN performances p ON p.id_session = s._id
    ORDER BY s.name
  `);

  if (!result.length) return [];

  const columns = result[0].columns;
  const values = result[0].values;

  return values.map((row) => ({
    id: row[columns.indexOf("id")] as string,
    name: row[columns.indexOf("name")] as string,
    description: row[columns.indexOf("description")] as string,
  }));
}

function getHerculesSessionExercises(db: Database, sessionId: string): HerculesSessionExercise[] {
  const result = db.exec(`
    SELECT
      CAST(se._id AS TEXT) as id,
      CAST(se.id_session AS TEXT) as session_id,
      CAST(se.id_exercise AS TEXT) as exercise_id,
      se.position,
      COALESCE(se.id_superset, 0) as id_superset,
      COALESCE(se.nb_reps, '') as nb_reps,
      COALESCE(se.loads, '') as loads,
      COALESCE(se.nb_sets, 1) as nb_sets,
      COALESCE(se.rest_time_between_sets, '120') as rest_time_between_sets,
      COALESCE(se.rest_time_end_of_exercise, 120) as rest_time_end_of_exercise
    FROM session_exercises se
    WHERE se.id_session = ${sessionId}
    ORDER BY se.position
  `);

  if (!result.length) return [];

  const columns = result[0].columns;
  const values = result[0].values;

  return values.map((row) => ({
    id: row[columns.indexOf("id")] as string,
    sessionId: row[columns.indexOf("session_id")] as string,
    exerciseId: row[columns.indexOf("exercise_id")] as string,
    position: row[columns.indexOf("position")] as number,
    idSuperset: row[columns.indexOf("id_superset")] as number,
    nbReps: row[columns.indexOf("nb_reps")] as string,
    loads: row[columns.indexOf("loads")] as string,
    nbSets: row[columns.indexOf("nb_sets")] as number,
    restTimeBetweenSets: row[columns.indexOf("rest_time_between_sets")] as string,
    restTimeEndOfExercise: row[columns.indexOf("rest_time_end_of_exercise")] as number,
  }));
}

function parseHerculesArray(str: string | null): number[] {
  if (!str) return [];
  return str
    .split("-")
    .map((v) => parseFloat(v.trim()))
    .filter((v) => !isNaN(v));
}

function parseRestTime(str: string | null): number {
  if (!str) return 60;
  const parts = str.split("-");
  return parseInt(parts[0]) || 60;
}

interface CreatedWorkout {
  id: string;
  itemCount: number;
  exerciseCount: number;
  setCount: number;
}

async function createWorkout(
  pool: Pool,
  userId: string,
  name: string,
  description: string,
  sessionExercises: HerculesSessionExercise[],
  exerciseMapping: Record<string, ExerciseMappingEntry>
): Promise<CreatedWorkout> {
  const workoutResult = await pool.query(
    `INSERT INTO workouts (id, user_id, name, description, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
     RETURNING id`,
    [userId, name, description || null]
  );
  const workoutId = workoutResult.rows[0].id;

  // Group exercises by superset
  const exercisesBySuperset = new Map<number, HerculesSessionExercise[]>();
  for (const ex of sessionExercises) {
    const key = ex.idSuperset;
    if (!exercisesBySuperset.has(key)) {
      exercisesBySuperset.set(key, []);
    }
    exercisesBySuperset.get(key)!.push(ex);
  }

  const workoutItems: Array<{
    type: "exercise" | "superset";
    position: number;
    exercises: HerculesSessionExercise[];
  }> = [];

  // Individual exercises (idSuperset === 0)
  const individualExercises = exercisesBySuperset.get(0) || [];
  for (const ex of individualExercises) {
    workoutItems.push({
      type: "exercise",
      position: ex.position,
      exercises: [ex],
    });
  }

  // Supersets (idSuperset > 0)
  for (const [supersetId, exercises] of exercisesBySuperset) {
    if (supersetId === 0) continue;
    exercises.sort((a, b) => a.position - b.position);
    workoutItems.push({
      type: "superset",
      position: exercises[0].position,
      exercises: exercises,
    });
  }

  workoutItems.sort((a, b) => a.position - b.position);

  let itemCount = 0;
  let exerciseCount = 0;
  let setCount = 0;

  for (let itemIndex = 0; itemIndex < workoutItems.length; itemIndex++) {
    const item = workoutItems[itemIndex];

    // Skip if any exercise is not in mapping
    const allExercisesMapped = item.exercises.every(
      (ex) => exerciseMapping[ex.exerciseId] !== undefined
    );
    if (!allExercisesMapped) {
      console.log(
        `      ⚠️  Skipping item with unmapped exercise: ${item.exercises.map((e) => e.exerciseId).join(", ")}`
      );
      continue;
    }

    const rounds = item.type === "superset" ? item.exercises[0].nbSets : 1;
    const lastExercise = item.exercises[item.exercises.length - 1];
    const restAfter = lastExercise.restTimeEndOfExercise || 120;

    const workoutItemResult = await pool.query(
      `INSERT INTO workout_items (id, workout_id, type, position, rounds, rest_after)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
       RETURNING id`,
      [workoutId, item.type, itemIndex, rounds, restAfter]
    );
    const workoutItemId = workoutItemResult.rows[0].id;
    itemCount++;

    for (let exIndex = 0; exIndex < item.exercises.length; exIndex++) {
      const hercEx = item.exercises[exIndex];
      const mapping = exerciseMapping[hercEx.exerciseId];

      if (!mapping) continue;

      const restBetweenSets = parseRestTime(hercEx.restTimeBetweenSets);

      const workoutItemExerciseResult = await pool.query(
        `INSERT INTO workout_item_exercises (id, workout_item_id, exercise_id, position, rest_between_sets)
         VALUES (gen_random_uuid(), $1, $2, $3, $4)
         RETURNING id`,
        [workoutItemId, mapping.momentumId, exIndex, restBetweenSets]
      );
      const workoutItemExerciseId = workoutItemExerciseResult.rows[0].id;
      exerciseCount++;

      const reps = parseHerculesArray(hercEx.nbReps);
      const loads = parseHerculesArray(hercEx.loads);
      const numSets = Math.max(reps.length, loads.length, hercEx.nbSets);

      for (let setIndex = 0; setIndex < numSets; setIndex++) {
        const targetReps = reps[setIndex] || reps[reps.length - 1] || 10;
        const targetWeight = loads[setIndex] ?? loads[loads.length - 1] ?? null;

        await pool.query(
          `INSERT INTO workout_sets (id, workout_item_exercise_id, set_number, target_reps, target_weight)
           VALUES (gen_random_uuid(), $1, $2, $3, $4)`,
          [workoutItemExerciseId, setIndex + 1, targetReps, targetWeight > 0 ? targetWeight : null]
        );
        setCount++;
      }
    }
  }

  return { id: workoutId, itemCount, exerciseCount, setCount };
}

main().catch((error) => {
  console.error("Erreur:", error);
  process.exit(1);
});
