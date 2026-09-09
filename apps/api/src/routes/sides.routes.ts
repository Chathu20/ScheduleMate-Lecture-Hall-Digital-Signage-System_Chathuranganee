import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const sides = await prisma.side.findMany();
  res.json(sides);
});

router.get('/:id', async (req, res) => {
  const side = await prisma.side.findUnique({
    where: { side_id: Number(req.params.id) },
  });
  if (!side) return res.status(404).json({ message: 'Side not found' });
  res.json(side);
});

router.post('/', async (req, res) => {
  const { floor_id, side_code } = req.body;
  if (!floor_id || !side_code) {
    return res.status(400).json({ message: 'floor_id and side_code are required' });
  }

  try {
    const side = await prisma.side.create({ data: { floor_id, side_code } });
    res.status(201).json(side);
  } catch (err) {
    res.status(400).json({ message: 'Invalid floor_id' });
  }
});

router.put('/:id', async (req, res) => {
  const { side_code } = req.body;
  try {
    const side = await prisma.side.update({
      where: { side_id: Number(req.params.id) },
      data: { side_code },
    });
    res.json(side);
  } catch (err) {
    res.status(404).json({ message: 'Side not found' });
  }
});

export default router;