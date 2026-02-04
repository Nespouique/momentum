/**
 * Story 4.4: Import des mensurations Hercules
 *
 * Ce script:
 * 1. Lit les mensurations de la base SQLite Hercules (user_body_measurements)
 * 2. Crée les Measurements dans Momentum
 *
 * Usage: npx tsx scripts/hercules-import-measurements.ts
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

// Database URL - defaults to dev, can be overridden with env var
const DATABASE_URL =
  process.env["DATABASE_URL"] || "postgresql://momentum:momentum_dev@localhost:5432/momentum";

// User email for import
const USER_EMAIL = "hallais.elliot@gmail.com";

// Cutoff date - only import measurements after this date
const CUTOFF_DATE = new Date("2024-02-28").getTime();

interface HerculesMeasurement {
  id: number;
  date: number;
  neck: number;
  shoulders: number;
  chest: number;
  bicepsLeft: number;
  bicepsRight: number;
  forearmLeft: number;
  forearmRight: number;
  wristLeft: number;
  wristRight: number;
  waist: number;
  hips: number;
  thighLeft: number;
  thighRight: number;
  calfLeft: number;
  calfRight: number;
  ankleLeft: number;
  ankleRight: number;
}

async function main() {
  console.log("=== Story 4.4: Import des mensurations Hercules ===\n");
  console.log(`Database: ${DATABASE_URL.replace(/:[^:@]+@/, ":***@")}`);
  console.log(`Hercules DB: ${HERCULES_DB_PATH}\n`);

  // Initialize SQLite
  const SQL = await initSqlJs();
  const herculesDbBuffer = fs.readFileSync(HERCULES_DB_PATH);
  const herculesDb: Database = new SQL.Database(herculesDbBuffer);

  // Connect to PostgreSQL
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    // Get user ID
    const userResult = await pool.query("SELECT id FROM users WHERE email = $1", [USER_EMAIL]);
    if (!userResult.rows.length) {
      throw new Error(`User not found: ${USER_EMAIL}`);
    }
    const userId = userResult.rows[0].id;
    console.log(`Using user ID: ${userId}\n`);

    // 1. Get measurements from Hercules
    console.log("1. Lecture des mensurations Hercules...");
    const measurements = getHerculesMeasurements(herculesDb);
    console.log(`   → ${measurements.length} mensurations trouvées\n`);

    // 2. Import measurements
    console.log("2. Import des mensurations...\n");
    let created = 0;
    let skipped = 0;

    for (const m of measurements) {
      const measurementDate = new Date(m.date);
      // Set time to midnight for date comparison
      measurementDate.setHours(0, 0, 0, 0);
      const dateStr = measurementDate.toLocaleDateString("fr-FR");

      // Check if measurement already exists for this date
      const existing = await pool.query(
        `SELECT id FROM measurements WHERE user_id = $1 AND date = $2`,
        [userId, measurementDate]
      );

      if (existing.rows.length > 0) {
        console.log(`   ✅ Existe: ${dateStr}`);
        skipped++;
        continue;
      }

      // Convert 0 values to null
      const toNull = (v: number): number | null => (v === 0 ? null : v);

      // Create measurement
      await pool.query(
        `INSERT INTO measurements (
          id, user_id, date,
          neck, shoulders, chest,
          biceps_left, biceps_right,
          forearm_left, forearm_right,
          wrist_left, wrist_right,
          waist, hips,
          thigh_left, thigh_right,
          calf_left, calf_right,
          ankle_left, ankle_right,
          notes, created_at
        ) VALUES (
          gen_random_uuid(), $1, $2,
          $3, $4, $5,
          $6, $7,
          $8, $9,
          $10, $11,
          $12, $13,
          $14, $15,
          $16, $17,
          $18, $19,
          $20, NOW()
        )`,
        [
          userId,
          measurementDate,
          toNull(m.neck),
          toNull(m.shoulders),
          toNull(m.chest),
          toNull(m.bicepsLeft),
          toNull(m.bicepsRight),
          toNull(m.forearmLeft),
          toNull(m.forearmRight),
          toNull(m.wristLeft),
          toNull(m.wristRight),
          toNull(m.waist),
          toNull(m.hips),
          toNull(m.thighLeft),
          toNull(m.thighRight),
          toNull(m.calfLeft),
          toNull(m.calfRight),
          toNull(m.ankleLeft),
          toNull(m.ankleRight),
          "Importé depuis Hercules",
        ]
      );

      console.log(`   📝 Créé: ${dateStr}`);
      console.log(`      - Cou: ${m.neck}cm, Épaules: ${m.shoulders}cm, Poitrine: ${m.chest}cm`);
      console.log(`      - Taille: ${m.waist}cm, Hanches: ${m.hips}cm`);
      console.log(
        `      - Biceps G/D: ${m.bicepsLeft}/${m.bicepsRight}cm, Avant-bras: ${m.forearmLeft}/${m.forearmRight}cm`
      );
      console.log(
        `      - Cuisses G/D: ${m.thighLeft}/${m.thighRight}cm, Mollets: ${m.calfLeft}/${m.calfRight}cm`
      );
      created++;
    }

    // Summary
    console.log("\n=== Résumé ===");
    console.log(`   Créées:   ${created}`);
    console.log(`   Existantes: ${skipped}`);
    console.log(`   Total:    ${measurements.length}`);
    console.log("\n✅ Import terminé avec succès!");
  } finally {
    herculesDb.close();
    await pool.end();
  }
}

function getHerculesMeasurements(db: Database): HerculesMeasurement[] {
  const result = db.exec(`
    SELECT
      _id,
      date,
      COALESCE(neck, 0) as neck,
      COALESCE(shoulders, 0) as shoulders,
      COALESCE(chest, 0) as chest,
      COALESCE(biceps_left, 0) as biceps_left,
      COALESCE(biceps_right, 0) as biceps_right,
      COALESCE(forearm_left, 0) as forearm_left,
      COALESCE(forearm_right, 0) as forearm_right,
      COALESCE(wrist_left, 0) as wrist_left,
      COALESCE(wrist_right, 0) as wrist_right,
      COALESCE(waist, 0) as waist,
      COALESCE(hips, 0) as hips,
      COALESCE(thigh_left, 0) as thigh_left,
      COALESCE(thigh_right, 0) as thigh_right,
      COALESCE(calf_left, 0) as calf_left,
      COALESCE(calf_right, 0) as calf_right,
      COALESCE(ankle_left, 0) as ankle_left,
      COALESCE(ankle_right, 0) as ankle_right
    FROM user_body_measurements
    WHERE date >= ${CUTOFF_DATE}
    ORDER BY date
  `);

  if (!result.length) return [];

  const columns = result[0].columns;
  const values = result[0].values;

  return values.map((row) => ({
    id: row[columns.indexOf("_id")] as number,
    date: row[columns.indexOf("date")] as number,
    neck: row[columns.indexOf("neck")] as number,
    shoulders: row[columns.indexOf("shoulders")] as number,
    chest: row[columns.indexOf("chest")] as number,
    bicepsLeft: row[columns.indexOf("biceps_left")] as number,
    bicepsRight: row[columns.indexOf("biceps_right")] as number,
    forearmLeft: row[columns.indexOf("forearm_left")] as number,
    forearmRight: row[columns.indexOf("forearm_right")] as number,
    wristLeft: row[columns.indexOf("wrist_left")] as number,
    wristRight: row[columns.indexOf("wrist_right")] as number,
    waist: row[columns.indexOf("waist")] as number,
    hips: row[columns.indexOf("hips")] as number,
    thighLeft: row[columns.indexOf("thigh_left")] as number,
    thighRight: row[columns.indexOf("thigh_right")] as number,
    calfLeft: row[columns.indexOf("calf_left")] as number,
    calfRight: row[columns.indexOf("calf_right")] as number,
    ankleLeft: row[columns.indexOf("ankle_left")] as number,
    ankleRight: row[columns.indexOf("ankle_right")] as number,
  }));
}

main().catch((error) => {
  console.error("Erreur:", error);
  process.exit(1);
});
