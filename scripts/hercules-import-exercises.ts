/**
 * Story 4.1: Import des exercices Hercules
 *
 * Ce script:
 * 1. Lit la base SQLite Hercules
 * 2. Crée les exercices manquants dans Momentum
 * 3. Génère un fichier de mapping hercules-id → momentum-id
 *
 * Usage: npx tsx scripts/hercules-import-exercises.ts
 */

import * as fs from "fs";
import * as path from "path";
import initSqlJs, { Database } from "sql.js";
import { Pool } from "pg";

// Configuration
const HERCULES_DB_PATH = path.join(
  __dirname,
  "../docs/features/Hercule_18-01-2026_19h33m23s_v34.db"
);
const OUTPUT_MAPPING_PATH = path.join(__dirname, "hercules-exercise-mapping.json");

// Database URL - defaults to dev, can be overridden with env var
const DATABASE_URL =
  process.env["DATABASE_URL"] || "postgresql://momentum:momentum_dev@localhost:5432/momentum";

// Exercices à ignorer (étirements, rééducation) - avec trim pour éviter les espaces
const IGNORED_EXERCISES = ["Étirements pecs", "Étirement table épaules", "Allongé raises"];

// Mapping Hercules → Momentum (exercices existants) - noms trimés
// Format: herculesName → { momentumName, muscleGroups (for creation if missing) }
const EXERCISE_MAPPING: Record<string, { name: string; muscleGroups: string[] }> = {
  "Développé couché": { name: "Développé couché barre", muscleGroups: ["pecs", "triceps"] },
  "Développé décliné à la machine": { name: "Declined chest press", muscleGroups: ["pecs"] },
  "Presse à buste": { name: "Chest press", muscleGroups: ["pecs"] },
  "Tractions poitrine prise large": { name: "Tractions", muscleGroups: ["dos", "biceps"] },
  "Curl marteau alterné avec haltères": { name: "Curl marteau", muscleGroups: ["biceps"] },
  "Extension triceps poulie haute en pronation": {
    name: "Triceps poulie haute",
    muscleGroups: ["triceps"],
  },
  "Élévations latérales avec haltères": { name: "Élévations latérales", muscleGroups: ["epaules"] },
  "Hip thrust": { name: "Hip thrust", muscleGroups: ["fessiers", "ischios"] },
  "Curl jambe assis": { name: "Leg curl", muscleGroups: ["ischios"] },
};

// Exercices à créer avec leur mapping de nom et groupes musculaires - noms trimés
const EXERCISES_TO_CREATE_MAP: Record<string, { name: string; muscleGroups: string[] }> = {
  "Écartés à la poulie vis-à-vis": { name: "Cable fly", muscleGroups: ["pecs"] },
  "Tirage poitrine prise large": { name: "Tirage vertical", muscleGroups: ["dos"] },
  "Tirage horizontal prise neutre serrée": { name: "Tirage horizontal", muscleGroups: ["dos"] },
  "Tirage sous horizontal": { name: "Tirage sous horizontal", muscleGroups: ["dos"] },
  "Curl Larry Scott à la barre": { name: "Curl pupitre barre", muscleGroups: ["biceps"] },
  "Curl incliné haltères supination": { name: "Curl incliné", muscleGroups: ["biceps"] },
  "Curl concentré supination": { name: "Curl concentré", muscleGroups: ["biceps"] },
  "Side épaule coiffe": { name: "Rotation externe épaule", muscleGroups: ["epaules"] },
  "Triceps sur chaise": { name: "Dips à la machine", muscleGroups: ["triceps"] },
  "Développé épaule à la machine": {
    name: "Développé militaire à la machine",
    muscleGroups: ["epaules", "triceps"],
  },
  "Arrière Épaules": { name: "Oiseau à la poulie", muscleGroups: ["epaules", "dos"] },
  "Split squat": { name: "Split squat", muscleGroups: ["quadriceps", "fessiers"] },
};


interface HerculesExercise {
  id: string; // String to avoid BigInt precision loss
  name: string;
}

interface MomentumExercise {
  id: string;
  name: string;
  muscle_groups: string[];
}

interface ExerciseMappingEntry {
  herculesId: string; // String to avoid BigInt precision loss
  herculesName: string;
  momentumId: string;
  momentumName: string;
  action: "created" | "mapped" | "ignored";
}

async function main() {
  console.log("=== Story 4.1: Import des exercices Hercules ===\n");
  console.log(`Database: ${DATABASE_URL.replace(/:[^:@]+@/, ":***@")}`);
  console.log(`Hercules DB: ${HERCULES_DB_PATH}\n`);

  // Initialize SQLite
  const SQL = await initSqlJs();
  const herculesDbBuffer = fs.readFileSync(HERCULES_DB_PATH);
  const herculesDb: Database = new SQL.Database(herculesDbBuffer);

  // Connect to PostgreSQL
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    // 1. Get all Hercules exercises used in performances
    console.log("1. Lecture des exercices Hercules utilisés...");
    const herculesExercises = getUsedHerculesExercises(herculesDb);
    console.log(`   → ${herculesExercises.length} exercices trouvés\n`);

    // 2. Get all existing Momentum exercises
    console.log("2. Lecture des exercices Momentum existants...");
    const momentumExercises = await getMomentumExercises(pool);
    console.log(`   → ${momentumExercises.length} exercices existants\n`);

    // Create a map for quick lookup
    const momentumByName = new Map<string, MomentumExercise>();
    for (const ex of momentumExercises) {
      momentumByName.set(ex.name, ex);
    }

    // 3. Process each Hercules exercise
    console.log("3. Traitement des exercices...\n");
    const mapping: Record<string, ExerciseMappingEntry> = {};
    let created = 0;
    let mapped = 0;
    let ignored = 0;

    for (const hercEx of herculesExercises) {
      // Trim the name for comparison (some Hercules names have trailing spaces)
      const trimmedName = hercEx.name.trim();

      // Check if should be ignored
      if (IGNORED_EXERCISES.includes(trimmedName)) {
        console.log(`   ❌ IGNORER: ${trimmedName}`);
        ignored++;
        continue;
      }

      // Check if should be mapped to existing
      const mappedEntry = EXERCISE_MAPPING[trimmedName];
      if (mappedEntry) {
        const existing = momentumByName.get(mappedEntry.name);
        if (existing) {
          mapping[hercEx.id] = {
            herculesId: hercEx.id,
            herculesName: trimmedName,
            momentumId: existing.id,
            momentumName: existing.name,
            action: "mapped",
          };
          console.log(`   🔗 MAPPER: ${trimmedName} → ${mappedEntry.name}`);
          mapped++;
        } else {
          // Create the exercise if it doesn't exist (for dev environment)
          const newExercise = await createExercise(
            pool,
            mappedEntry.name,
            mappedEntry.muscleGroups
          );
          momentumByName.set(newExercise.name, newExercise);
          mapping[hercEx.id] = {
            herculesId: hercEx.id,
            herculesName: trimmedName,
            momentumId: newExercise.id,
            momentumName: newExercise.name,
            action: "created",
          };
          console.log(
            `   ➕ CRÉER (MAPPER manquant): ${trimmedName} → ${mappedEntry.name} (${mappedEntry.muscleGroups.join(", ")})`
          );
          created++;
        }
        continue;
      }

      // Check if should be created
      const toCreate = EXERCISES_TO_CREATE_MAP[trimmedName];
      if (toCreate) {
        // Check if already exists (idempotent)
        const existing = momentumByName.get(toCreate.name);
        if (existing) {
          mapping[hercEx.id] = {
            herculesId: hercEx.id,
            herculesName: trimmedName,
            momentumId: existing.id,
            momentumName: existing.name,
            action: "mapped",
          };
          console.log(`   ✅ EXISTE: ${trimmedName} → ${toCreate.name} (déjà créé)`);
          mapped++;
        } else {
          // Create the exercise
          const newExercise = await createExercise(pool, toCreate.name, toCreate.muscleGroups);
          momentumByName.set(newExercise.name, newExercise);
          mapping[hercEx.id] = {
            herculesId: hercEx.id,
            herculesName: trimmedName,
            momentumId: newExercise.id,
            momentumName: newExercise.name,
            action: "created",
          };
          console.log(
            `   ➕ CRÉER: ${trimmedName} → ${toCreate.name} (${toCreate.muscleGroups.join(", ")})`
          );
          created++;
        }
        continue;
      }

      // Unknown exercise
      console.warn(`   ⚠️  INCONNU: ${trimmedName} (ID: ${hercEx.id})`);
    }

    // 4. Save mapping to JSON
    console.log("\n4. Sauvegarde du fichier de mapping...");
    fs.writeFileSync(OUTPUT_MAPPING_PATH, JSON.stringify(mapping, null, 2));
    console.log(`   → ${OUTPUT_MAPPING_PATH}\n`);

    // Summary
    console.log("=== Résumé ===");
    console.log(`   Créés:   ${created}`);
    console.log(`   Mappés:  ${mapped}`);
    console.log(`   Ignorés: ${ignored}`);
    console.log(`   Total:   ${Object.keys(mapping).length} dans le mapping\n`);

    console.log("✅ Import terminé avec succès!");
  } finally {
    herculesDb.close();
    await pool.end();
  }
}

function getUsedHerculesExercises(db: Database): HerculesExercise[] {
  // Get exercises that have at least one performance
  // CAST id to TEXT to avoid JavaScript BigInt precision loss
  const result = db.exec(`
    SELECT DISTINCT CAST(e._id AS TEXT) as id, e.name
    FROM exercises e
    INNER JOIN performances p ON p.id_exercise = e._id
    ORDER BY e.name
  `);

  if (!result.length) return [];

  const columns = result[0].columns;
  const values = result[0].values;

  return values.map((row) => ({
    id: row[columns.indexOf("id")] as string,
    name: row[columns.indexOf("name")] as string,
  }));
}

async function getMomentumExercises(pool: Pool): Promise<MomentumExercise[]> {
  const result = await pool.query(`
    SELECT id, name, muscle_groups
    FROM exercises
    ORDER BY name
  `);
  return result.rows;
}

async function createExercise(
  pool: Pool,
  name: string,
  muscleGroups: string[]
): Promise<MomentumExercise> {
  const result = await pool.query(
    `
    INSERT INTO exercises (id, name, muscle_groups, created_at)
    VALUES (gen_random_uuid(), $1, $2, NOW())
    RETURNING id, name, muscle_groups
  `,
    [name, muscleGroups]
  );
  return result.rows[0];
}

main().catch((error) => {
  console.error("Erreur:", error);
  process.exit(1);
});
