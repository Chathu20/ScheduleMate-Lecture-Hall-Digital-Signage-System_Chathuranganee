import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth.middleware';
import { getFloatingNow } from '../lib/time';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const lecturers = await prisma.lecturer.findMany();
    res.json(lecturers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch lecturers' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const lecturer = await prisma.lecturer.findUnique({
      where: { lecturer_id: Number(req.params.id) },
    });
    if (!lecturer) return res.status(404).json({ message: 'Lecturer not found' });
    res.json(lecturer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch lecturer' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { full_name, email } = req.body;
    if (!full_name || !email) {
      return res.status(400).json({ message: 'full_name and email are required' });
    }

    const lecturer = await prisma.lecturer.create({ data: { full_name, email } });
    res.status(201).json(lecturer);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'email already exists' });
    }
    console.error(error);
    res.status(500).json({ message: 'Failed to create lecturer' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { full_name, email } = req.body;
    const lecturer = await prisma.lecturer.update({
      where: { lecturer_id: Number(req.params.id) },
      data: { full_name, email },
    });
    res.json(lecturer);
  } catch (error) {
    console.error(error);
    res.status(404).json({ message: 'Lecturer not found' });
  }
});

// DELETE a lecturer — blocked while they have upcoming sessions
router.delete('/:id', async (req, res) => {
  const lecturerId = Number(req.params.id);
  try {
    const upcomingCount = await prisma.session.count({
      where: {
        lecturer_id: lecturerId,
        status: { in: ['ACTIVE', 'RESCHEDULED'] },
        session_date: { gte: getFloatingNow() },
      },
    });

    if (upcomingCount > 0) {
      return res.status(409).json({
        message: `This lecturer is assigned to ${upcomingCount} upcoming session(s). Reassign or cancel those sessions before deleting.`,
        upcomingCount,
      });
    }

    await prisma.lecturer.delete({ where: { lecturer_id: lecturerId } });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(404).json({ message: 'Lecturer not found' });
  }
});

export default router;