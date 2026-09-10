import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware);

const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

function deriveDayOfWeek(dateStr: string): string {
  const date = new Date(dateStr);
  return DAY_NAMES[date.getUTCDay()];
}

// GET all sessions
router.get('/', async (req, res) => {
  try {
    const sessions = await prisma.session.findMany({
      include: { room: true, module: true, lecturer: true },
      orderBy: { session_date: 'asc' },
    });
    res.json(sessions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch sessions' });
  }
});

// GET one session by id
router.get('/:id', async (req, res) => {
  try {
    const session = await prisma.session.findUnique({
      where: { session_id: Number(req.params.id) },
      include: { room: true, module: true, lecturer: true, changes: true },
    });
    if (!session) return res.status(404).json({ message: 'Session not found' });
    res.json(session);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch session' });
  }
});

// CREATE a session (no conflict check yet — added in Step 14b)
router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { room_id, module_id, lecturer_id, session_date, start_time, end_time, session_type } = req.body;

    if (!room_id || !module_id || !lecturer_id || !session_date || !start_time || !end_time || !session_type) {
      return res.status(400).json({
        message: 'room_id, module_id, lecturer_id, session_date, start_time, end_time, and session_type are required',
      });
    }

    const session = await prisma.session.create({
      data: {
        room_id,
        module_id,
        lecturer_id,
        created_by: req.admin!.admin_id,
        session_date: new Date(session_date),
        day_of_week: deriveDayOfWeek(session_date),
        start_time: new Date(start_time),
        end_time: new Date(end_time),
        status: 'ACTIVE',
        session_type,
      },
      include: { room: true, module: true, lecturer: true },
    });

    res.status(201).json(session);
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ message: 'Invalid room_id, module_id, or lecturer_id' });
  }
});

// UPDATE a session (no conflict check yet — added in Step 14b)
router.put('/:id', async (req, res) => {
  try {
    const { room_id, module_id, lecturer_id, session_date, start_time, end_time, session_type } = req.body;

    const data: any = {};
    if (room_id) data.room_id = room_id;
    if (module_id) data.module_id = module_id;
    if (lecturer_id) data.lecturer_id = lecturer_id;
    if (session_date) {
      data.session_date = new Date(session_date);
      data.day_of_week = deriveDayOfWeek(session_date);
    }
    if (start_time) data.start_time = new Date(start_time);
    if (end_time) data.end_time = new Date(end_time);
    if (session_type) data.session_type = session_type;

    const session = await prisma.session.update({
      where: { session_id: Number(req.params.id) },
      data,
      include: { room: true, module: true, lecturer: true },
    });
    res.json(session);
  } catch (error) {
    console.error(error);
    res.status(404).json({ message: 'Session not found' });
  }
});

export default router;