require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const equipment = [
  { name: "Digital Oscilloscope", description: "Two-channel digital oscilloscope for electronics experiments.", location: "Electronics Lab" },
  { name: "3D Printer", description: "FDM 3D printer for prototyping and design projects.", location: "Innovation Lab" },
  { name: "Centrifuge", description: "Laboratory centrifuge for sample separation.", location: "Biology Lab" },
  { name: "Digital Microscope", description: "Digital microscope for observing and capturing specimens.", location: "Biology Lab" },
  { name: "Function Generator", description: "Signal generator for electronics and communication experiments.", location: "Electronics Lab" }
];

async function main() {
  for (const item of equipment) {
    await prisma.equipment.upsert({
      where: { name: item.name },
      update: item,
      create: item
    });
  }
  console.log(`Seeded ${equipment.length} equipment records.`);
}

main()
  .catch((error) => { console.error(error); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
