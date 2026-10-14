const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authenticate, authorize } = require("../middleware/auth");
const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);

function validTime(value) {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function overlaps(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

router.get("/", async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: req.auth.role === "LAB_ADMIN" ? {} : { userId: req.auth.id },
      include: {
        equipment: true,
        user: { select: { id: true, name: true, email: true, role: true } }
      },
      orderBy: [{ date: "desc" }, { startTime: "asc" }]
    });
    res.json({ bookings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not load bookings." });
  }
});

router.post("/", authorize("STUDENT", "FACULTY"), async (req, res) => {
  try {
    const equipmentId = Number(req.body.equipmentId);
    const dateText = String(req.body.date || "");
    const startTime = String(req.body.startTime || "");
    const endTime = String(req.body.endTime || "");
    const purpose = String(req.body.purpose || "").trim();

    if (!Number.isInteger(equipmentId)) return res.status(400).json({ error: "Choose valid equipment." });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) return res.status(400).json({ error: "Choose a valid date." });
    if (!validTime(startTime) || !validTime(endTime) || startTime >= endTime) {
      return res.status(400).json({ error: "End time must be later than start time." });
    }
    const date = new Date(`${dateText}T00:00:00.000Z`);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (date < today) return res.status(400).json({ error: "Bookings cannot be made in the past." });

    const item = await prisma.equipment.findUnique({ where: { id: equipmentId } });
    if (!item || !item.isAvailable) return res.status(400).json({ error: "This equipment is unavailable." });

    const existing = await prisma.booking.findMany({
      where: { equipmentId, date, status: "CONFIRMED" }
    });
    if (existing.some(b => overlaps(startTime, endTime, b.startTime, b.endTime))) {
      return res.status(409).json({ error: "This time overlaps an existing confirmed booking." });
    }

    const booking = await prisma.booking.create({
      data: { userId: req.auth.id, equipmentId, date, startTime, endTime, purpose },
      include: { equipment: true }
    });
    res.status(201).json({ booking });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not create booking." });
  }
});

router.patch("/:id/cancel", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) return res.status(404).json({ error: "Booking not found." });
    if (req.auth.role !== "LAB_ADMIN" && booking.userId !== req.auth.id) {
      return res.status(403).json({ error: "You can only cancel your own bookings." });
    }
    if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
      return res.status(400).json({ error: "This booking cannot be cancelled." });
    }
    const updated = await prisma.booking.update({ where: { id }, data: { status: "CANCELLED" } });
    res.json({ booking: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not cancel booking." });
  }
});

router.patch("/:id/review", authorize("LAB_ADMIN"), async (req, res) => {
  const id = Number(req.params.id);
  const status = String(req.body.status || "").toUpperCase();
  if (!["CONFIRMED", "REJECTED"].includes(status)) {
    return res.status(400).json({ error: "Status must be CONFIRMED or REJECTED." });
  }
  try {
    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) return res.status(404).json({ error: "Booking not found." });
    if (booking.status !== "PENDING") return res.status(400).json({ error: "Only pending bookings can be reviewed." });

    if (status === "CONFIRMED") {
      const conflicts = await prisma.booking.findMany({
        where: {
          equipmentId: booking.equipmentId,
          date: booking.date,
          status: "CONFIRMED",
          NOT: { id }
        }
      });
      if (conflicts.some(b => overlaps(booking.startTime, booking.endTime, b.startTime, b.endTime))) {
        return res.status(409).json({ error: "Cannot confirm: this booking overlaps another confirmed booking." });
      }
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { status },
      include: {
        equipment: true,
        user: { select: { id: true, name: true, email: true, role: true } }
      }
    });
    res.json({ booking: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not review booking." });
  }
});

module.exports = router;
