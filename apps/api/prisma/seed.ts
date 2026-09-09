import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.admin.create({
    data: {
      username: "testadmin",
      password_hash: passwordHash,
      role: "SUPER_ADMIN",
    },
  });

  console.log("Admin created:", admin.username);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });