import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

// GET all floors
router.get("/", async (req, res) => {
  try {
    const floors = await prisma.floor.findMany();
    res.json(floors);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to fetch floors",
    });
  }
});

// CREATE floor
router.post("/", async (req, res) => {
  try {
    const { building_id, floor_number, is_full_lab_floor } = req.body;

    if (building_id === undefined || floor_number === undefined) {
      return res.status(400).json({
        message: "building_id and floor_number are required",
      });
    }

    const building = await prisma.building.findUnique({
      where: {
        building_id: Number(building_id),
      },
    });

    if (!building) {
      return res.status(400).json({
        message: "Building not found",
      });
    }

    const floor = await prisma.floor.create({
      data: {
        building_id: Number(building_id),
        floor_number: Number(floor_number),
        is_full_lab_floor: Boolean(is_full_lab_floor),
      },
    });

    res.status(201).json(floor);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to create floor",
    });
  }
});

export default router;