import { Router } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import {
  authMiddleware,
  AuthenticatedRequest,
} from '../middleware/auth.middleware';
import { getFloatingNow } from '../lib/time';

const RECURRING_WEEKLY_OCCURRENCES = 12;

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

// Find an overlapping ACTIVE session matching the given criteria (room and/or lecturer)
async function findConflict(
  criteria: { room_id?: number; lecturer_id?: number },
  session_date: Date,
  start_time: Date,
  end_time: Date,
  excludeSessionId?: number
) {
  return prisma.session.findFirst({
    where: {
      ...criteria,
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
      room: true,
    },
  });
}

// A room is double-booked when another ACTIVE session in the same room overlaps
function findRoomConflict(
  room_id: number,
  session_date: Date,
  start_time: Date,
  end_time: Date,
  excludeSessionId?: number
) {
  return findConflict({ room_id }, session_date, start_time, end_time, excludeSessionId);
}

// A lecturer is double-booked when they already have another ACTIVE session
// at an overlapping time, regardless of which room it's in
function findLecturerConflict(
  lecturer_id: number,
  session_date: Date,
  start_time: Date,
  end_time: Date,
  excludeSessionId?: number
) {
  return findConflict({ lecturer_id }, session_date, start_time, end_time, excludeSessionId);
}

function conflictResponse(conflict: NonNullable<Awaited<ReturnType<typeof findConflict>>>) {
  return {
    session_id: conflict.session_id,
    module: conflict.module.module_name,
    lecturer: conflict.lecturer.full_name,
    room: conflict.room.room_code,
    start_time: conflict.start_time,
    end_time: conflict.end_time,
  };
}

// GET all sessions
router.get('/', async (req, res) => {
  try {
    const sessions = await prisma.session.findMany({
      include: {
        room: { include: { side: { include: { floor: true } } } },
        module: true,
        lecturer: true,
        changes: { orderBy: { changed_at: 'desc' } },
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
      repeat_weekly,
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

    // Check for an overlapping ACTIVE session in the same room...
    const roomConflict = await findRoomConflict(
      room_id,
      parsedDate,
      parsedStart,
      parsedEnd
    );

    if (roomConflict) {
      return res.status(409).json({
        message:
          'This room is already booked for an overlapping time slot',
        conflictingSession: conflictResponse(roomConflict),
      });
    }

    // ...and for the same lecturer already teaching elsewhere at an overlapping time
    const lecturerConflict = await findLecturerConflict(
      lecturer_id,
      parsedDate,
      parsedStart,
      parsedEnd
    );

    if (lecturerConflict) {
      return res.status(409).json({
        message:
          'This lecturer is already scheduled in another room during an overlapping time slot',
        conflictingSession: conflictResponse(lecturerConflict),
      });
    }

    const recurrence_group_id = repeat_weekly ? crypto.randomUUID() : null;
    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const occurrences = repeat_weekly ? RECURRING_WEEKLY_OCCURRENCES : 1;

    let firstSession = null;
    let skippedCount = 0;

    for (let i = 0; i < occurrences; i++) {
      const occDate = new Date(parsedDate.getTime() + i * WEEK_MS);
      const occStart = new Date(parsedStart.getTime() + i * WEEK_MS);
      const occEnd = new Date(parsedEnd.getTime() + i * WEEK_MS);

      if (i > 0) {
        // For occurrences after the first, silently skip any that conflict
        // on either the room or the lecturer
        const occRoomConflict = await findRoomConflict(room_id, occDate, occStart, occEnd);
        const occLecturerConflict = occRoomConflict
          ? null
          : await findLecturerConflict(lecturer_id, occDate, occStart, occEnd);
        if (occRoomConflict || occLecturerConflict) {
          skippedCount++;
          continue;
        }
      }

      const created = await prisma.session.create({
        data: {
          room_id,
          module_id,
          lecturer_id,
          created_by: req.admin!.admin_id,
          session_date: occDate,
          day_of_week: deriveDayOfWeek(occDate.toISOString()),
          start_time: occStart,
          end_time: occEnd,
          status: 'ACTIVE',
          session_type,
          recurrence_group_id: recurrence_group_id ?? undefined,
        },
        include: {
          room: true,
          module: true,
          lecturer: true,
        },
      });

      if (i === 0) firstSession = created;
    }

    res.status(201).json({ ...firstSession, skippedCount });
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
    const newLecturerId = lecturer_id ?? existing.lecturer_id;

    const newDate = session_date
      ? new Date(session_date)
      : existing.session_date;

    const newStart = start_time
      ? new Date(start_time)
      : existing.start_time;

    const newEnd = end_time
      ? new Date(end_time)
      : existing.end_time;

    // Check for a room conflict, excluding this session itself
    const roomConflict = await findRoomConflict(
      newRoomId,
      newDate,
      newStart,
      newEnd,
      sessionId
    );

    if (roomConflict) {
      return res.status(409).json({
        message:
          'This room is already booked for an overlapping time slot',
        conflictingSession: conflictResponse(roomConflict),
      });
    }

    // Check for the lecturer already being booked elsewhere, excluding this session itself
    const lecturerConflict = await findLecturerConflict(
      newLecturerId,
      newDate,
      newStart,
      newEnd,
      sessionId
    );

    if (lecturerConflict) {
      return res.status(409).json({
        message:
          'This lecturer is already scheduled in another room during an overlapping time slot',
        conflictingSession: conflictResponse(lecturerConflict),
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

// CANCEL a session (FR-10)
router.patch('/:id/cancel', async (req: AuthenticatedRequest, res) => {
  try {
    const sessionId = Number(req.params.id);
    const { reason } = req.body;

    const session = await prisma.session.findUnique({
      where: {
        session_id: sessionId,
      },
    });

    if (!session) {
      return res.status(404).json({
        message: 'Session not found',
      });
    }

    const [updatedSession] = await prisma.$transaction([
      prisma.session.update({
        where: {
          session_id: sessionId,
        },
        data: {
          status: 'CANCELLED',
        },
      }),
      prisma.sessionChange.create({
        data: {
          session_id: sessionId,
          changed_by: req.admin!.admin_id,
          change_type: 'CANCEL',
          reason: reason || null,
        },
      }),
    ]);

    res.json(updatedSession);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Failed to cancel session',
    });
  }
});

// RESCHEDULE a session (FR-11)
router.patch('/:id/reschedule', async (req: AuthenticatedRequest, res) => {
  try {
    const sessionId = Number(req.params.id);

    const {
      new_room_id,
      new_date,
      new_start_time,
      new_end_time,
    } = req.body;

    if (
      !new_room_id ||
      !new_date ||
      !new_start_time ||
      !new_end_time
    ) {
      return res.status(400).json({
        message:
          'new_room_id, new_date, new_start_time, and new_end_time are required',
      });
    }

    const session = await prisma.session.findUnique({
      where: {
        session_id: sessionId,
      },
    });

    if (!session) {
      return res.status(404).json({
        message: 'Session not found',
      });
    }

    const parsedDate = new Date(new_date);
    const parsedStart = new Date(new_start_time);
    const parsedEnd = new Date(new_end_time);

    // Same conflict checks as create/update — the new slot must be free for
    // both the room and the lecturer (reschedule doesn't change the lecturer)
    const roomConflict = await findRoomConflict(
      new_room_id,
      parsedDate,
      parsedStart,
      parsedEnd,
      sessionId
    );

    if (roomConflict) {
      return res.status(409).json({
        message:
          'The new time slot conflicts with an existing session in that room',
        conflictingSession: conflictResponse(roomConflict),
      });
    }

    const lecturerConflict = await findLecturerConflict(
      session.lecturer_id,
      parsedDate,
      parsedStart,
      parsedEnd,
      sessionId
    );

    if (lecturerConflict) {
      return res.status(409).json({
        message:
          'The lecturer is already scheduled in another room during that time slot',
        conflictingSession: conflictResponse(lecturerConflict),
      });
    }

    const [updatedSession] = await prisma.$transaction([
      prisma.session.update({
        where: {
          session_id: sessionId,
        },
        data: {
          status: 'RESCHEDULED',
        },
      }),
      prisma.sessionChange.create({
        data: {
          session_id: sessionId,
          changed_by: req.admin!.admin_id,
          change_type: 'RESCHEDULE',
          new_room_id,
          new_date: parsedDate,
          new_start_time: parsedStart,
          new_end_time: parsedEnd,
        },
      }),
    ]);

    res.json(updatedSession);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Failed to reschedule session',
    });
  }
});

// DELETE a single session record entirely
router.delete('/:id', async (req, res) => {
  try {
    const sessionId = Number(req.params.id);
    await prisma.$transaction([
      prisma.sessionChange.deleteMany({ where: { session_id: sessionId } }),
      prisma.session.delete({ where: { session_id: sessionId } }),
    ]);
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(404).json({ message: 'Session not found' });
  }
});

// DELETE every future occurrence of a recurring series; past ones are kept for history
router.delete('/recurring/:groupId', async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const now = getFloatingNow();

    const futureSessionIds = (
      await prisma.session.findMany({
        where: { recurrence_group_id: groupId, session_date: { gte: now } },
        select: { session_id: true },
      })
    ).map((s) => s.session_id);

    await prisma.$transaction([
      prisma.sessionChange.deleteMany({ where: { session_id: { in: futureSessionIds } } }),
      prisma.session.deleteMany({ where: { session_id: { in: futureSessionIds } } }),
    ]);

    res.json({ deletedCount: futureSessionIds.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete recurring schedule' });
  }
});

export default router;