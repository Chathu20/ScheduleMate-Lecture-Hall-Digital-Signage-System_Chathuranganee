import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

// GET all buildings
router.get('/', async (req, res) => {
  try {
    const buildings = await prisma.building.findMany();
    res.json(buildings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch buildings' });
  }
});

// GET one building
router.get('/:id', async (req, res) => {
  try {
    const building = await prisma.building.findUnique({
      where: {
        building_id: Number(req.params.id),
      },
    });

    if (!building) {
      return res.status(404).json({
        message: 'Building not found',
      });
    }

    res.json(building);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Failed to fetch building',
    });
  }
});

// CREATE building
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        message: 'name is required',
      });
    }

    const building = await prisma.building.create({
      data: {
        name,
      },
    });

    res.status(201).json(building);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Failed to create building',
    });
  }
});

// UPDATE building
router.put('/:id', async (req, res) => {
  try {
    const { name } = req.body;

    const building = await prisma.building.update({
      where: {
        building_id: Number(req.params.id),
      },
      data: {
        name,
      },
    });

    res.json(building);
  } catch (error) {
    console.error(error);
    res.status(404).json({
      message: 'Building not found',
    });
  }
});

export default router;