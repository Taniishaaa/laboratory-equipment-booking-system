const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

function validDate(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(new Date(`${date}T00:00:00.000Z`).getTime());
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { userId: req.user.id },
      include: { equipment: { select: { id: true, name: true, location: true } } },
      orderBy: [{ date: "desc" }, { startTime: "desc" }]
    });
    res.json(bookings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not load bookings." });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const equipmentId = Number(req.body.equipmentId);
    const dateText = String(req.body.date || "");
    const startTime = String(req.body.startTime || "");
    const endTime = String(req.body.endTime || "");

    if (!Number.isInteger(equipmentId) || equipmentId < 1 || !validDate(dateText) ||
        !/^([01]\d|2[0-3]):00$/.test(startTime) || !/^([01]\d|2[0-3]):00$/.test(endTime)) {
      return res.status(400).json({ message: "Select equipment, date and a valid time slot." });
    }
    const startHour = Number(startTime.slice(0, 2));
    if (startHour < 9 || startHour >= 17 || endTime !== `${String(startHour + 1).padStart(2, "0")}:00`) {
      return res.status(400).json({ message: "Bookings must use one-hour slots between 09:00 and 17:00." });
    }
    const date = new Date(`${dateText}T00:00:00.000Z`);
    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    if (date < today) return res.status(400).json({ message: "Bookings must be for today or a future date." });

    const equipment = await prisma.equipment.findUnique({ where: { id: equipmentId } });
    if (!equipment || !equipment.isAvailable) return res.status(404).json({ message: "Equipment is unavailable." });

    const conflict = await prisma.booking.findFirst({
      where: {
        equipmentId, date, status: { in: ["PENDING", "CONFIRMED"] },
        startTime: { lt: endTime }, endTime: { gt: startTime }
      }
    });
    if (conflict) return res.status(409).json({ message: "That slot has already been requested or booked. Choose another slot." });

    const booking = await prisma.booking.create({
      data: { userId: req.user.id, equipmentId, date, startTime, endTime, status: "PENDING" },
      include: { equipment: { select: { id: true, name: true, location: true } } }
    });
    res.status(201).json({ message: "Booking request submitted.", booking });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not submit booking request." });
  }
});

router.patch("/:id/confirm", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const booking = await prisma.booking.findFirst({ where: { id, userId: req.user.id } });
    if (!booking) return res.status(404).json({ message: "Booking not found." });
    if (booking.status !== "PENDING") return res.status(400).json({ message: "Only pending requests can be confirmed." });

    const conflict = await prisma.booking.findFirst({
      where: {
        id: { not: id }, equipmentId: booking.equipmentId, date: booking.date,
        status: { in: ["PENDING", "CONFIRMED"] },
        startTime: { lt: booking.endTime }, endTime: { gt: booking.startTime }
      }
    });
    if (conflict) return res.status(409).json({ message: "This slot is no longer available." });

    const updated = await prisma.booking.update({
      where: { id }, data: { status: "CONFIRMED" },
      include: { equipment: { select: { id: true, name: true, location: true } } }
    });
    res.json({ message: "Booking confirmed.", booking: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not confirm booking." });
  }
});

router.patch("/:id/cancel", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const booking = await prisma.booking.findFirst({ where: { id, userId: req.user.id } });
    if (!booking) return res.status(404).json({ message: "Booking not found." });
    if (booking.status === "CANCELLED") return res.status(400).json({ message: "Booking is already cancelled." });

    const updated = await prisma.booking.update({
      where: { id }, data: { status: "CANCELLED" },
      include: { equipment: { select: { id: true, name: true, location: true } } }
    });
    res.json({ message: "Booking cancelled.", booking: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not cancel booking." });
  }
});

module.exports = router;
