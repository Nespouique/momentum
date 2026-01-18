import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import bcrypt from "bcrypt";

const connectionString = process.env["DATABASE_URL"];
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

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
