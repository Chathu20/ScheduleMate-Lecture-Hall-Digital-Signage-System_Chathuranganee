import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const displays = await prisma.displayDevice.findMany();
    res.json(displays);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch display devices' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const display = await prisma.displayDevice.findUnique({
      where: { display_id: Number(req.params.id) },
    });
    if (!display) return res.status(404).json({ message: 'Display device not found' });
    res.json(display);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch display device' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { device_name, side_id } = req.body;
    if (!device_name || !side_id) {
      return res.status(400).json({ message: 'device_name and side_id are required' });
    }

    const display = await prisma.displayDevice.create({
      data: { device_name, side_id, status: 'OFFLINE' },
    });
    res.status(201).json(display);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'This side already has a display device assigned' });
    }
    console.error(error);
    res.status(400).json({ message: 'Invalid side_id' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { device_name, side_id, status } = req.body;
    const display = await prisma.displayDevice.update({
      where: { display_id: Number(req.params.id) },
      data: { device_name, side_id, status },
    });
    res.json(display);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'This side already has a display device assigned' });
    }
    console.error(error);
    res.status(404).json({ message: 'Display device not found' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.displayDevice.delete({ where: { display_id: Number(req.params.id) } });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(404).json({ message: 'Display device not found' });
  }
});

export default router;