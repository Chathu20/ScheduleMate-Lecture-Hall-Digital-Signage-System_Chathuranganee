import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const rooms = await prisma.room.findMany();
  res.json(rooms);
});

router.get('/:id', async (req, res) => {
  const room = await prisma.room.findUnique({
    where: { room_id: Number(req.params.id) },
  });
  if (!room) return res.status(404).json({ message: 'Room not found' });
  res.json(room);
});

router.post('/', async (req, res) => {
  try {
    const { side_id, room_code, capacity, room_type } = req.body;
    if (!side_id || !room_code || capacity === undefined || !room_type) {
      return res.status(400).json({ message: 'side_id, room_code, capacity, and room_type are required' });
    }

    const room = await prisma.room.create({
      data: { side_id, room_code, capacity, room_type },
    });
    res.status(201).json(room);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'room_code already exists for this side' });
    }
    console.error(error);
    res.status(400).json({ message: 'Invalid side_id' });
  }
});

router.put('/:id', async (req, res) => {
  const { room_code, capacity, room_type } = req.body;
  try {
    const room = await prisma.room.update({
      where: { room_id: Number(req.params.id) },
      data: { room_code, capacity, room_type },
    });
    res.json(room);
  } catch (err) {
    res.status(404).json({ message: 'Room not found' });
  }
});

export default router;