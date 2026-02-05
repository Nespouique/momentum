/**
 * Import des exercices Hercules pour Caro
 *
 * Ce script:
 * 1. Lit la base SQLite Hercules de Caro
 * 2. Crée les exercices manquants dans Momentum
 * 3. Génère un fichier de mapping hercules-id → momentum-id
 *
 * Usage: npx tsx scripts/hercules-caro-import-exercises.ts
 */

import * as fs from "fs";
import * as path from "path";
import initSqlJs, { Database } from "sql.js";
import { Pool } from "pg";

// Configuration
const HERCULES_DB_PATH = path.join(__dirname, "../docs/features/Hercule_Caro.db");
const OUTPUT_MAPPING_PATH = path.join(__dirname, "hercules-caro-exercise-mapping.json");

const DATABASE_URL =
  process.env["DATABASE_URL"] || "postgresql://momentum:momentum_dev@localhost:5432/momentum";

// Aucun exercice à ignorer pour Caro
const IGNORED_EXERCISES: string[] = [];

// Mapping Hercules → Momentum (exercices existants) — 31 mappings
const EXERCISE_MAPPING: Record<string, { name: string; muscleGroups: string[] }> = {
  "Planche": { name: "Planche", muscleGroups: ["abdos", "lombaires"] },
  "Planche latérale": { name: "Gainage latéral", muscleGroups: ["abdos", "lombaires"] },
  "Relevé de jambes": { name: "Relevé de jambes", muscleGroups: ["abdos"] },
  "Rowing horizontal au câble": { name: "Tirage horizontal", muscleGroups: ["dos"] },
  "Soulevé de terre": { name: "Soulevé de terre", muscleGroups: ["dos", "ischios", "fessiers", "lombaires"] },
  "Tirage poitrine prise large": { name: "Tirage vertical", muscleGroups: ["dos"] },
  "Tractions en pronation": { name: "Tractions", muscleGroups: ["dos", "biceps"] },
  "Tractions poitrine prise large": { name: "Tractions", muscleGroups: ["dos", "biceps"] },
  "Coiffe des rotateurs": { name: "Rotation externe épaule", muscleGroups: ["epaules"] },
  "Développé militaire haltères": { name: "Développé militaire", muscleGroups: ["epaules", "triceps"] },
  "Face pull": { name: "Face pull", muscleGroups: ["epaules", "trapezes", "dos"] },
  "Oiseau unilatéral à la poulie": { name: "Oiseau à la poulie", muscleGroups: ["epaules", "dos"] },
  "Élévations antérieures avec haltères": { name: "Élévations frontales", muscleGroups: ["epaules"] },
  "Élévations latérales avec haltères": { name: "Élévations latérales", muscleGroups: ["epaules"] },
  "Hip thrust": { name: "Hip thrust", muscleGroups: ["fessiers", "ischios"] },
  "Curl jambe assis": { name: "Leg curl", muscleGroups: ["ischios"] },
  "Leg curl": { name: "Leg curl", muscleGroups: ["ischios"] },
  "Soulevé de terre roumain": { name: "Soulevé de terre roumain", muscleGroups: ["ischios", "fessiers", "lombaires"] },
  "Extension à la chaise avec enroulement": { name: "Extensions lombaires", muscleGroups: ["lombaires"] },
  "Extension mollet debout": { name: "Mollets debout", muscleGroups: ["mollets"] },
  "Développé couché": { name: "Développé couché barre", muscleGroups: ["pecs", "triceps"] },
  "Développé couché avec haltères": { name: "Développé couché haltères", muscleGroups: ["triceps", "pecs"] },
  "Écartés à la poulie": { name: "Cable fly", muscleGroups: ["pecs"] },
  "Écartés à la poulie vis-à-vis": { name: "Cable fly", muscleGroups: ["pecs"] },
  "Extension de jambes": { name: "Leg extension", muscleGroups: ["quadriceps"] },
  "Fentes marchées": { name: "Fentes", muscleGroups: ["quadriceps", "fessiers", "ischios"] },
  "Presse à cuisses": { name: "Leg press", muscleGroups: ["quadriceps", "fessiers"] },
  "Split squat": { name: "Split squat", muscleGroups: ["quadriceps", "fessiers"] },
  "Squat barre": { name: "Squat", muscleGroups: ["quadriceps", "fessiers", "ischios"] },
  "Dips": { name: "Dips", muscleGroups: ["pecs", "triceps", "epaules"] },
  "Extension triceps poulie haute en pronation": { name: "Triceps poulie haute", muscleGroups: ["triceps"] },
  // Fusion: "Hip thrust à 1 jambe" → même exercice que "Hip thrust unilatéral"
  "Hip thrust à 1 jambe": { name: "Hip thrust unilatéral", muscleGroups: ["fessiers", "ischios"] },
};

// Exercices à créer — 34 nouveaux exercices
const EXERCISES_TO_CREATE_MAP: Record<string, { name: string; muscleGroups: string[] }> = {
  "Abdos": { name: "Abdos", muscleGroups: ["abdos"] },
  "Crunch décliné": { name: "Crunch décliné", muscleGroups: ["abdos"] },
  "Crunch à la balle": { name: "Crunch à la balle", muscleGroups: ["abdos"] },
  "Crunch à la poulie haute": { name: "Crunch poulie haute", muscleGroups: ["abdos"] },
  "Hallow rocks": { name: "Hollow rocks", muscleGroups: ["abdos"] },
  "Relevé de genoux": { name: "Relevé de genoux", muscleGroups: ["abdos"] },
  "Curl Larry Scott unilatéral": { name: "Curl pupitre unilatéral", muscleGroups: ["biceps"] },
  "Arrière épaules élastique": { name: "Arrière épaules élastique", muscleGroups: ["epaules"] },
  "One arm dumbell snatch": { name: "One arm dumbbell snatch", muscleGroups: ["epaules"] },
  "Rear delt fly": { name: "Rear delt fly", muscleGroups: ["epaules", "dos"] },
  "Élévations latérales avec haltères penché en avant": { name: "Élévations latérales penché", muscleGroups: ["epaules"] },
  "Fentes sur box": { name: "Fentes sur box", muscleGroups: ["fessiers", "quadriceps"] },
  "Hip thrust unilatéral": { name: "Hip thrust unilatéral", muscleGroups: ["fessiers", "ischios"] },
  "Kickback unilatéral à la poulie basse": { name: "Kickback poulie", muscleGroups: ["fessiers"] },
  "Soulevé de terre jambes tendues": { name: "Soulevé de terre jambes tendues", muscleGroups: ["ischios", "fessiers", "lombaires"] },
  "Superman": { name: "Superman", muscleGroups: ["lombaires"] },
  "Extensions mollets à la presse à cuisses": { name: "Mollets à la presse", muscleGroups: ["mollets"] },
  "Développé décliné avec haltères": { name: "Développé décliné haltères", muscleGroups: ["pecs", "triceps", "epaules"] },
  "Développé incliné avec haltères": { name: "Développé incliné haltères", muscleGroups: ["pecs", "triceps", "epaules"] },
  "Pompes": { name: "Pompes", muscleGroups: ["pecs"] },
  "Écartés à la machine": { name: "Machine fly", muscleGroups: ["pecs"] },
  "Abducteur": { name: "Abducteur", muscleGroups: ["fessiers"] },
  "Adducteur": { name: "Adducteur", muscleGroups: ["quadriceps"] },
  "Box jump": { name: "Box jump", muscleGroups: ["quadriceps"] },
  "Burpee": { name: "Burpees", muscleGroups: ["quadriceps", "pecs", "epaules"] },
  "Hack squat": { name: "Hack squat", muscleGroups: ["quadriceps", "fessiers"] },
  "Squat sumo avec haltère": { name: "Squat sumo", muscleGroups: ["quadriceps", "fessiers", "ischios"] },
  "Squat à la Smith machine": { name: "Squat Smith machine", muscleGroups: ["quadriceps", "fessiers"] },
  "Wall ball squat": { name: "Wall ball", muscleGroups: ["quadriceps", "epaules"] },
  "Échauffement/Mobilité": { name: "Échauffement/Mobilité", muscleGroups: [] },
  "Yeux": { name: "Exercices yeux", muscleGroups: [] },
  "Functional training": { name: "Functional training", muscleGroups: [] },
  "Poirier/Équilibre": { name: "Poirier/Équilibre", muscleGroups: ["epaules", "abdos"] },
  "Parcours": { name: "Parcours", muscleGroups: [] },
};

interface HerculesExercise {
  id: string;
  name: string;
}

interface MomentumExercise {
  id: string;
  name: string;
  muscle_groups: string[];
}

interface ExerciseMappingEntry {
  herculesId: string;
  herculesName: string;
  momentumId: string;
  momentumName: string;
  action: "created" | "mapped" | "ignored";
}

async function main() {
  console.log("=== Import des exercices Hercules — CARO ===\n");
  console.log(`Database: ${DATABASE_URL.replace(/:[^:@]+@/, ":***@")}`);
  console.log(`Hercules DB: ${HERCULES_DB_PATH}\n`);

  const SQL = await initSqlJs();
  const herculesDbBuffer = fs.readFileSync(HERCULES_DB_PATH);
  const herculesDb: Database = new SQL.Database(herculesDbBuffer);

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
          const newExercise = await createExercise(pool, mappedEntry.name, mappedEntry.muscleGroups);
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
            `   ➕ CRÉER: ${trimmedName} → ${toCreate.name} (${toCreate.muscleGroups.join(", ") || "sans groupe"})`
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
    `INSERT INTO exercises (id, name, muscle_groups, created_at)
     VALUES (gen_random_uuid(), $1, $2, NOW())
     RETURNING id, name, muscle_groups`,
    [name, muscleGroups]
  );
  return result.rows[0];
}

main().catch((error) => {
  console.error("Erreur:", error);
  process.exit(1);
});
