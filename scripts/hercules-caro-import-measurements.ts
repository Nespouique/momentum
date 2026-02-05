/**
 * Import des mensurations Hercules pour Caro
 *
 * Ce script:
 * 1. Lit les mensurations (user_body_measurements) de la base SQLite Hercules
 * 2. Lit les poids (user_body_mass) de la base SQLite Hercules
 * 3. Crée les Measurements dans Momentum en fusionnant poids + mensurations par date
 *
 * Pas de date cutoff — on importe TOUT (21 mensurations + 15 poids)
 *
 * Usage: npx tsx scripts/hercules-caro-import-measurements.ts
 */

import * as fs from "fs";
import * as path from "path";
import initSqlJs, { Database } from "sql.js";
import { Pool } from "pg";

// Configuration
const HERCULES_DB_PATH = path.join(__dirname, "../docs/features/Hercule_Caro.db");

const DATABASE_URL =
  process.env["DATABASE_URL"] || "postgresql://momentum:momentum_dev@localhost:5432/momentum";

const USER_EMAIL = "caro.sacre@gmail.com";

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

interface HerculesBodyMass {
  id: number;
  date: number;
  weight: number;
  muscleMass: number;
  bodyFat: number;
  bodyWater: number;
  boneMass: number;
}

async function main() {
  console.log("=== Import des mensurations Hercules — CARO ===\n");
  console.log(`Database: ${DATABASE_URL.replace(/:[^:@]+@/, ":***@")}`);
  console.log(`Hercules DB: ${HERCULES_DB_PATH}\n`);

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

    // 1. Get measurements from Hercules
    console.log("1. Lecture des mensurations Hercules...");
    const measurements = getHerculesMeasurements(herculesDb);
    console.log(`   → ${measurements.length} mensurations trouvées\n`);

    // 2. Get body mass from Hercules
    console.log("2. Lecture des poids Hercules...");
    const bodyMasses = getHerculesBodyMass(herculesDb);
    console.log(`   → ${bodyMasses.length} entrées de poids trouvées\n`);

    // 3. Build a unified date map: date → { measurement?, weight? }
    // Normalize all dates to midnight for merging
    const dateMap = new Map<string, { measurement?: HerculesMeasurement; weight?: number }>();

    for (const m of measurements) {
      const date = new Date(m.date);
      date.setHours(0, 0, 0, 0);
      const dateKey = date.toISOString().split("T")[0];
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {});
      }
      dateMap.get(dateKey)!.measurement = m;
    }

    for (const bm of bodyMasses) {
      const date = new Date(bm.date);
      date.setHours(0, 0, 0, 0);
      const dateKey = date.toISOString().split("T")[0];
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {});
      }
      dateMap.get(dateKey)!.weight = bm.weight;
    }

    // Sort dates
    const sortedDates = Array.from(dateMap.keys()).sort();

    console.log(`3. ${sortedDates.length} dates uniques à importer\n`);

    // 4. Import
    console.log("4. Import des mensurations...\n");
    let created = 0;
    let skipped = 0;

    for (const dateKey of sortedDates) {
      const entry = dateMap.get(dateKey)!;
      const measurementDate = new Date(dateKey);

      // Check if measurement already exists for this date
      const existing = await pool.query(
        `SELECT id FROM measurements WHERE user_id = $1 AND date = $2`,
        [userId, measurementDate]
      );

      if (existing.rows.length > 0) {
        console.log(`   ✅ Existe: ${dateKey}`);
        skipped++;
        continue;
      }

      const m = entry.measurement;
      const toNull = (v: number | undefined): number | null =>
        v === undefined || v === 0 ? null : v;

      await pool.query(
        `INSERT INTO measurements (
          id, user_id, date, weight,
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
          gen_random_uuid(), $1, $2, $3,
          $4, $5, $6,
          $7, $8,
          $9, $10,
          $11, $12,
          $13, $14,
          $15, $16,
          $17, $18,
          $19, $20,
          $21, NOW()
        )`,
        [
          userId,
          measurementDate,
          entry.weight || null,
          m ? toNull(m.neck) : null,
          m ? toNull(m.shoulders) : null,
          m ? toNull(m.chest) : null,
          m ? toNull(m.bicepsLeft) : null,
          m ? toNull(m.bicepsRight) : null,
          m ? toNull(m.forearmLeft) : null,
          m ? toNull(m.forearmRight) : null,
          m ? toNull(m.wristLeft) : null,
          m ? toNull(m.wristRight) : null,
          m ? toNull(m.waist) : null,
          m ? toNull(m.hips) : null,
          m ? toNull(m.thighLeft) : null,
          m ? toNull(m.thighRight) : null,
          m ? toNull(m.calfLeft) : null,
          m ? toNull(m.calfRight) : null,
          m ? toNull(m.ankleLeft) : null,
          m ? toNull(m.ankleRight) : null,
          "Importé depuis Hercules",
        ]
      );

      const hasM = m !== undefined;
      const hasW = entry.weight !== undefined;
      const type = hasM && hasW ? "mensurations + poids" : hasM ? "mensurations" : "poids";

      if (m) {
        console.log(`   📝 ${dateKey} (${type})`);
        console.log(`      Cou: ${m.neck || "-"}cm, Épaules: ${m.shoulders || "-"}cm, Poitrine: ${m.chest || "-"}cm`);
        console.log(`      Taille: ${m.waist || "-"}cm, Hanches: ${m.hips || "-"}cm`);
        if (entry.weight) console.log(`      Poids: ${entry.weight}kg`);
      } else {
        console.log(`   📝 ${dateKey} (${type}): ${entry.weight}kg`);
      }
      created++;
    }

    // Summary
    console.log("\n=== Résumé ===");
    console.log(`   Créées:     ${created}`);
    console.log(`   Existantes: ${skipped}`);
    console.log(`   Total:      ${sortedDates.length} dates`);
    console.log("\n✅ Import terminé avec succès!");
  } finally {
    herculesDb.close();
    await pool.end();
  }
}

function getHerculesMeasurements(db: Database): HerculesMeasurement[] {
  // No cutoff — import everything
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

function getHerculesBodyMass(db: Database): HerculesBodyMass[] {
  const result = db.exec(`
    SELECT
      _id,
      date,
      COALESCE(weight, 0) as weight,
      COALESCE(muscle_mass, 0) as muscle_mass,
      COALESCE(body_fat, 0) as body_fat,
      COALESCE(body_water, 0) as body_water,
      COALESCE(bone_mass, 0) as bone_mass
    FROM user_body_mass
    ORDER BY date
  `);

  if (!result.length) return [];

  const columns = result[0].columns;
  const values = result[0].values;

  return values.map((row) => ({
    id: row[columns.indexOf("_id")] as number,
    date: row[columns.indexOf("date")] as number,
    weight: row[columns.indexOf("weight")] as number,
    muscleMass: row[columns.indexOf("muscle_mass")] as number,
    bodyFat: row[columns.indexOf("body_fat")] as number,
    bodyWater: row[columns.indexOf("body_water")] as number,
    boneMass: row[columns.indexOf("bone_mass")] as number,
  }));
}

main().catch((error) => {
  console.error("Erreur:", error);
  process.exit(1);
});
