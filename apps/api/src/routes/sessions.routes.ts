import { Router } from 'express';
import { prisma } from '../lib/prisma';
import {
  authMiddleware,
  AuthenticatedRequest,
} from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

const DAY_NAMES = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
];

function deriveDayOfWeek(dateStr: string): string {
  const date = new Date(dateStr);
  return DAY_NAMES[date.getUTCDay()];
}

// Find an overlapping ACTIVE session
async function findConflictingSession(
  room_id: number,
  session_date: Date,
  start_time: Date,
  end_time: Date,
  excludeSessionId?: number
) {
  return prisma.session.findFirst({
    where: {
      room_id,
      session_date,
      status: 'ACTIVE',
      session_id: excludeSessionId
        ? { not: excludeSessionId }
        : undefined,
      start_time: { lt: end_time },
      end_time: { gt: start_time },
    },
    include: {
      module: true,
      lecturer: true,
    },
  });
}

// GET all sessions
router.get('/', async (req, res) => {
  try {
    const sessions = await prisma.session.findMany({
      include: {
        room: true,
        module: true,
        lecturer: true,
      },
      orderBy: {
        session_date: 'asc',
      },
    });

    res.json(sessions);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Failed to fetch sessions',
    });
  }
});

// GET one session by id
router.get('/:id', async (req, res) => {
  try {
    const session = await prisma.session.findUnique({
      where: {
        session_id: Number(req.params.id),
      },
      include: {
        room: true,
        module: true,
        lecturer: true,
        changes: true,
      },
    });

    if (!session) {
      return res.status(404).json({
        message: 'Session not found',
      });
    }

    res.json(session);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Failed to fetch session',
    });
  }
});

// CREATE a session with conflict detection
router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const {
      room_id,
      module_id,
      lecturer_id,
      session_date,
      start_time,
      end_time,
      session_type,
    } = req.body;

    if (
      !room_id ||
      !module_id ||
      !lecturer_id ||
      !session_date ||
      !start_time ||
      !end_time ||
      !session_type
    ) {
      return res.status(400).json({
        message:
          'room_id, module_id, lecturer_id, session_date, start_time, end_time, and session_type are required',
      });
    }

    const parsedDate = new Date(session_date);
    const parsedStart = new Date(start_time);
    const parsedEnd = new Date(end_time);

    // Check for overlapping ACTIVE session
    const conflict = await findConflictingSession(
      room_id,
      parsedDate,
      parsedStart,
      parsedEnd
    );

    if (conflict) {
      return res.status(409).json({
        message:
          'This room is already booked for an overlapping time slot',

        conflictingSession: {
          session_id: conflict.session_id,
          module: conflict.module.module_name,
          lecturer: conflict.lecturer.full_name,
          start_time: conflict.start_time,
          end_time: conflict.end_time,
        },
      });
    }

    const session = await prisma.session.create({
      data: {
        room_id,
        module_id,
        lecturer_id,
        created_by: req.admin!.admin_id,

        session_date: parsedDate,

        // Automatically derive day of week
        day_of_week: deriveDayOfWeek(session_date),

        start_time: parsedStart,
        end_time: parsedEnd,

        status: 'ACTIVE',
        session_type,
      },

      include: {
        room: true,
        module: true,
        lecturer: true,
      },
    });

    res.status(201).json(session);
  } catch (error: any) {
    console.error(error);

    res.status(400).json({
      message: 'Invalid room_id, module_id, or lecturer_id',
    });
  }
});

// UPDATE a session with conflict detection
router.put('/:id', async (req, res) => {
  try {
    const sessionId = Number(req.params.id);

    const {
      room_id,
      module_id,
      lecturer_id,
      session_date,
      start_time,
      end_time,
      session_type,
    } = req.body;

    // Find existing session
    const existing = await prisma.session.findUnique({
      where: {
        session_id: sessionId,
      },
    });

    if (!existing) {
      return res.status(404).json({
        message: 'Session not found',
      });
    }

    // Use new values if supplied,
    // otherwise keep existing values
    const newRoomId = room_id ?? existing.room_id;

    const newDate = session_date
      ? new Date(session_date)
      : existing.session_date;

    const newStart = start_time
      ? new Date(start_time)
      : existing.start_time;

    const newEnd = end_time
      ? new Date(end_time)
      : existing.end_time;

    // Check conflict and exclude the current session itself
    const conflict = await findConflictingSession(
      newRoomId,
      newDate,
      newStart,
      newEnd,
      sessionId
    );

    if (conflict) {
      return res.status(409).json({
        message:
          'This room is already booked for an overlapping time slot',

        conflictingSession: {
          session_id: conflict.session_id,
          module: conflict.module.module_name,
          lecturer: conflict.lecturer.full_name,
          start_time: conflict.start_time,
          end_time: conflict.end_time,
        },
      });
    }

    const data: any = {};

    if (room_id) {
      data.room_id = room_id;
    }

    if (module_id) {
      data.module_id = module_id;
    }

    if (lecturer_id) {
      data.lecturer_id = lecturer_id;
    }

    if (session_date) {
      data.session_date = newDate;
      data.day_of_week = deriveDayOfWeek(session_date);
    }

    if (start_time) {
      data.start_time = newStart;
    }

    if (end_time) {
      data.end_time = newEnd;
    }

    if (session_type) {
      data.session_type = session_type;
    }

    const session = await prisma.session.update({
      where: {
        session_id: sessionId,
      },

      data,

      include: {
        room: true,
        module: true,
        lecturer: true,
      },
    });

    res.json(session);
  } catch (error) {
    console.error(error);

    res.status(404).json({
      message: 'Session not found',
    });
  }
});

export default router;