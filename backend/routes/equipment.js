const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authenticate, authorize } = require("../middleware/auth");
const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);

router.get("/", async (req, res) => {
  try {
    const equipment = await prisma.equipment.findMany({
      where: req.auth.role === "LAB_ADMIN" ? {} : { isAvailable: true },
      orderBy: { name: "asc" }
    });
    res.json({ equipment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not load equipment." });
  }
});

router.post("/", authorize("LAB_ADMIN"), async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const description = String(req.body.description || "").trim();
    const location = String(req.body.location || "Main Laboratory").trim();
    if (!name || !description) return res.status(400).json({ error: "Name and description are required." });
    const item = await prisma.equipment.create({ data: { name, description, location } });
    res.status(201).json({ equipment: item });
  } catch (error) {
    if (error.code === "P2002") return res.status(409).json({ error: "Equipment name already exists." });
    console.error(error);
    res.status(500).json({ error: "Could not create equipment." });
  }
});

router.patch("/:id", authorize("LAB_ADMIN"), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid equipment ID." });
  const data = {};
  for (const key of ["name", "description", "location", "isAvailable"]) {
    if (req.body[key] !== undefined) data[key] = req.body[key];
  }
  try {
    const item = await prisma.equipment.update({ where: { id }, data });
    res.json({ equipment: item });
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ error: "Equipment not found." });
    if (error.code === "P2002") return res.status(409).json({ error: "Equipment name already exists." });
    res.status(500).json({ error: "Could not update equipment." });
  }
});

router.patch("/:id/disable", authorize("LAB_ADMIN"), async (req, res) => {
  try {
    const item = await prisma.equipment.update({
      where: { id: Number(req.params.id) },
      data: { isAvailable: false }
    });
    res.json({ equipment: item });
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ error: "Equipment not found." });
    res.status(500).json({ error: "Could not disable equipment." });
  }
});

module.exports = router;
