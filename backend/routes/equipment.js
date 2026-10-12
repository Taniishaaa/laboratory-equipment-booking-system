const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

router.get("/", requireAuth, async (_req, res) => {
  try {
    const equipment = await prisma.equipment.findMany({
      where: { isAvailable: true },
      orderBy: { name: "asc" }
    });
    res.json(equipment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not load equipment." });
  }
});

router.get("/:id/slots", requireAuth, async (req, res) => {
  try {
    const equipmentId = Number(req.params.id);
    const dateText = String(req.query.date || "");
    if (!Number.isInteger(equipmentId) || equipmentId < 1) return res.status(400).json({ message: "Invalid equipment." });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) return res.status(400).json({ message: "Choose a valid date." });

    const chosen = new Date(`${dateText}T00:00:00.000Z`);
    if (Number.isNaN(chosen.getTime())) return res.status(400).json({ message: "Choose a valid date." });
    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    const todayText = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,"0")}-${String(tomorrow.getDate()).padStart(2,"0")}`;
    if (dateText < todayText) return res.status(400).json({ message: "Bookings must be for today or a future date." });

    const equipment = await prisma.equipment.findUnique({ where: { id: equipmentId } });
    if (!equipment || !equipment.isAvailable) return res.status(404).json({ message: "Equipment not found or unavailable." });

    const bookings = await prisma.booking.findMany({
      where: { equipmentId, date: chosen, status: { in: ["PENDING", "CONFIRMED"] } },
      select: { startTime: true, endTime: true }
    });

    const slots = [];
    for (let hour = 9; hour < 17; hour++) {
      const startTime = `${String(hour).padStart(2, "0")}:00`;
      const endTime = `${String(hour + 1).padStart(2, "0")}:00`;
      const booked = bookings.some((b) => b.startTime < endTime && startTime < b.endTime);
      slots.push({ startTime, endTime, available: !booked });
    }
    res.json({ equipmentId, date: dateText, slots });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not load available slots." });
  }
});

module.exports = router;
