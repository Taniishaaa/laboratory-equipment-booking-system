require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

const equipment = [
  { name: "Digital Oscilloscope", description: "Two-channel digital oscilloscope for electronics experiments.", location: "Electronics Lab" },
  { name: "3D Printer", description: "FDM 3D printer for prototyping and design projects.", location: "Innovation Lab" },
  { name: "Centrifuge", description: "Laboratory centrifuge for sample separation.", location: "Biology Lab" },
  { name: "Digital Microscope", description: "Digital microscope for observing and capturing specimens.", location: "Biology Lab" },
  { name: "Function Generator", description: "Signal generator for electronics and communication experiments.", location: "Electronics Lab" }
];

const users = [
  { name: "Test Student", email: "student@labbook.test", password: "Student@123", role: "STUDENT" },
  { name: "Test Faculty", email: "faculty@labbook.test", password: "Faculty@123", role: "FACULTY" },
  { name: "Test Lab Admin", email: "admin@labbook.test", password: "Admin@123", role: "LAB_ADMIN" }
];

async function main() {
  for (const item of equipment) {
    await prisma.equipment.upsert({
      where: { name: item.name },
      update: item,
      create: item
    });
  }

  for (const user of users) {
    const password = await bcrypt.hash(user.password, 10);
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, password, role: user.role },
      create: { name: user.name, email: user.email, password, role: user.role }
    });
  }

  console.log(`Seeded ${equipment.length} equipment records and ${users.length} test users.`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
