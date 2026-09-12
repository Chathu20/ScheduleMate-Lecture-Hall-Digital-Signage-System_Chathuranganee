import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// Compute effective date/start/end for a session, accounting for reschedules
function getEffectiveSlot(session: any) {
  if (session.status === 'RESCHEDULED' && session.changes.length > 0) {
    const latestReschedule = session.changes
      .filter((c: any) => c.change_type === 'RESCHEDULE')
      .sort((a: any, b: any) => b.changed_at.getTime() - a.changed_at.getTime())[0];

    if (latestReschedule) {
      return {
        room_id: latestReschedule.new_room_id ?? session.room_id,
        session_date: latestReschedule.new_date,
        start_time: latestReschedule.new_start_time,
        end_time: latestReschedule.new_end_time,
      };
    }
  }
  return {
    room_id: session.room_id,
    session_date: session.session_date,
    start_time: session.start_time,
    end_time: session.end_time,
  };
}

const SETTINGS_DEFAULTS = {
  side_duration_seconds: 8,
  poll_interval_seconds: 30,
  upcoming_soon_threshold_min: 15,
  max_upcoming_per_slide: 5,
  institution_name: 'Sparkline Academy',
};

router.get('/:side_id', async (req, res) => {
  try {
    const sideId = Number(req.params.side_id);
    const now = new Date();

    const [side, settings] = await Promise.all([
      prisma.side.findUnique({ where: { side_id: sideId }, include: { floor: { include: { building: true } } } }),
      prisma.signageSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1, ...SETTINGS_DEFAULTS } }),
    ]);

    if (!side) {
      return res.status(404).json({ message: 'Side not found' });
    }

    // Today's date range (UTC midnight to midnight) — sessions are scoped per calendar day
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    // Get all rooms on this side
    const rooms = await prisma.room.findMany({ where: { side_id: sideId } });
    const roomIds = rooms.map((r) => r.room_id);

    // Get all sessions today, for any room that is CURRENTLY on this side OR
    // was rescheduled TO a room on this side (we fetch broadly, then filter by effective room_id below)
    const sessions = await prisma.session.findMany({
      where: {
        OR: [
          { room_id: { in: roomIds }, session_date: { gte: todayStart, lt: todayEnd } },
          {
            status: 'RESCHEDULED',
            changes: {
              some: {
                change_type: 'RESCHEDULE',
                new_room_id: { in: roomIds },
                new_date: { gte: todayStart, lt: todayEnd },
              },
            },
          },
        ],
      },
      include: {
        room: true,
        module: true,
        lecturer: true,
        changes: { orderBy: { changed_at: 'desc' } },
      },
    });

    const ongoing: any[] = [];
    const upcoming: any[] = [];
    const cancelled: any[] = [];
    const rescheduled: any[] = [];

    for (const session of sessions) {
      const effective = getEffectiveSlot(session);

      // Only include if the effective room is actually on this side
      if (!roomIds.includes(effective.room_id)) continue;

      const entry = {
        session_id: session.session_id,
        room_code: rooms.find((r) => r.room_id === effective.room_id)?.room_code,
        module: session.module.module_name,
        lecturer: session.lecturer.full_name,
        start_time: effective.start_time,
        end_time: effective.end_time,
        session_type: session.session_type,
      };

      if (session.status === 'CANCELLED') {
        cancelled.push({ ...entry, reason: session.changes.find((c: any) => c.change_type === 'CANCEL')?.reason });
      } else if (session.status === 'RESCHEDULED') {
        rescheduled.push({
          ...entry,
          original_start: session.start_time,
          original_end: session.end_time,
          original_room: session.room.room_code,
        });
        // A rescheduled session ALSO shows as Ongoing/Upcoming at its NEW slot
        if (effective.start_time <= now && now < effective.end_time) {
          ongoing.push(entry);
        } else if (effective.start_time > now) {
          upcoming.push(entry);
        }
      } else if (session.status === 'ACTIVE') {
        if (effective.start_time <= now && now < effective.end_time) {
          ongoing.push(entry);
        } else if (effective.start_time > now) {
          upcoming.push(entry);
        }
      }
    }

    // FR-19: Live Room Status per room on this side
    const UPCOMING_SOON_MS = settings.upcoming_soon_threshold_min * 60 * 1000;
    const liveRoomStatus = rooms.map((room) => {
      const roomSessions = sessions.filter((s) => {
        const eff = getEffectiveSlot(s);
        return eff.room_id === room.room_id && (s.status === 'ACTIVE' || s.status === 'RESCHEDULED');
      });

      const current = roomSessions.find((s) => {
        const eff = getEffectiveSlot(s);
        return eff.start_time <= now && now < eff.end_time;
      });
      if (current) return { room_code: room.room_code, status: 'Ongoing Now' };

      const soon = roomSessions.find((s) => {
        const eff = getEffectiveSlot(s);
        return eff.start_time > now && eff.start_time.getTime() - now.getTime() <= UPCOMING_SOON_MS;
      });
      if (soon) return { room_code: room.room_code, status: 'Upcoming Soon' };

      const finishedToday = roomSessions.find((s) => {
        const eff = getEffectiveSlot(s);
        return eff.end_time <= now;
      });
      if (finishedToday) return { room_code: room.room_code, status: 'Session Finished' };

      return { room_code: room.room_code, status: 'Available' };
    });

    res.json({
      side_id: sideId,
      server_time: now,
      location: {
        building_name: side.floor.building.name,
        floor_number: side.floor.floor_number,
        side_code: side.side_code,
      },
      settings: {
        side_duration_seconds: settings.side_duration_seconds,
        poll_interval_seconds: settings.poll_interval_seconds,
        institution_name: settings.institution_name,
      },
      ongoing,
      upcoming: upcoming.slice(0, settings.max_upcoming_per_slide),
      cancelled,
      rescheduled,
      liveRoomStatus,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to compute signage feed' });
  }
});

export default router;