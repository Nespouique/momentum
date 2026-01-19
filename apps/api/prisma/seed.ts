import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import bcrypt from "bcrypt";

const connectionString = process.env["DATABASE_URL"];
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Seed exercises with muscle groups
const seedExercises = [
  // Compound movements
  { name: "Développé couché", muscleGroups: ["pecs", "triceps", "epaules"] },
  { name: "Développé incliné", muscleGroups: ["pecs", "triceps", "epaules"] },
  { name: "Développé décliné", muscleGroups: ["pecs", "triceps", "epaules"] },
  { name: "Tractions", muscleGroups: ["dos", "biceps"] },
  { name: "Rowing barre", muscleGroups: ["dos", "biceps", "trapezes"] },
  { name: "Rowing haltère", muscleGroups: ["dos", "biceps"] },
  { name: "Squat", muscleGroups: ["quadriceps", "fessiers", "ischios"] },
  { name: "Soulevé de terre", muscleGroups: ["dos", "ischios", "fessiers", "lombaires"] },
  { name: "Soulevé de terre roumain", muscleGroups: ["ischios", "fessiers", "lombaires"] },
  { name: "Développé militaire", muscleGroups: ["epaules", "triceps"] },
  { name: "Dips", muscleGroups: ["pecs", "triceps", "epaules"] },
  // Isolation - Arms
  { name: "Curl biceps", muscleGroups: ["biceps"] },
  { name: "Curl marteau", muscleGroups: ["biceps"] },
  { name: "Extension triceps", muscleGroups: ["triceps"] },
  { name: "Triceps poulie haute", muscleGroups: ["triceps"] },
  // Isolation - Legs
  { name: "Leg press", muscleGroups: ["quadriceps", "fessiers"] },
  { name: "Leg extension", muscleGroups: ["quadriceps"] },
  { name: "Leg curl", muscleGroups: ["ischios"] },
  { name: "Fentes", muscleGroups: ["quadriceps", "fessiers", "ischios"] },
  { name: "Hip thrust", muscleGroups: ["fessiers", "ischios"] },
  { name: "Mollets debout", muscleGroups: ["mollets"] },
  { name: "Mollets assis", muscleGroups: ["mollets"] },
  // Isolation - Shoulders
  { name: "Élévations latérales", muscleGroups: ["epaules"] },
  { name: "Élévations frontales", muscleGroups: ["epaules"] },
  { name: "Face pull", muscleGroups: ["epaules", "trapezes", "dos"] },
  { name: "Shrugs", muscleGroups: ["trapezes"] },
  // Core
  { name: "Crunch", muscleGroups: ["abdos"] },
  { name: "Planche", muscleGroups: ["abdos", "lombaires"] },
  { name: "Gainage latéral", muscleGroups: ["abdos", "lombaires"] },
  { name: "Relevé de jambes", muscleGroups: ["abdos"] },
  { name: "Extensions lombaires", muscleGroups: ["lombaires"] },
];

async function main() {
  console.log("Seeding database...");

  // Create test user
  const passwordHash = await bcrypt.hash("password123", 10);

  const testUser = await prisma.user.upsert({
    where: { email: "test@momentum.dev" },
    update: {},
    create: {
      email: "test@momentum.dev",
      name: "Test User",
      passwordHash,
    },
  });

  console.log("Created test user:", testUser.email);

  // Seed exercises
  const existingExerciseCount = await prisma.exercise.count();

  if (existingExerciseCount === 0) {
    console.log("Seeding exercises...");
    for (const exercise of seedExercises) {
      await prisma.exercise.create({
        data: {
          name: exercise.name,
          muscleGroups: exercise.muscleGroups,
        },
      });
    }
    console.log(`Created ${seedExercises.length} exercises.`);
  } else {
    console.log(`${existingExerciseCount} exercises already exist. Skipping.`);
  }

  console.log("Seeding completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
