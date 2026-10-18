require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");

const app = express();
const prisma = new PrismaClient();
const port = Number(process.env.PORT || 3000);

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is missing. Set it in backend/.env before starting the server.");
  process.exit(1);
}

app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(503).json({ status: "error", database: "unavailable" });
  } catch {
    res.status(503).json({ status: "error", database: "unavailable" });
  }
});

app.use("/api/auth", require("./routes/auth"));
app.use("/api/equipment", require("./routes/equipment"));
app.use("/api/bookings", require("./routes/bookings"));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Unexpected server error." });
});

const server = app.listen(port, () => {
  console.log(`Laboratory Booking API listening on http://localhost:${port}`);
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
