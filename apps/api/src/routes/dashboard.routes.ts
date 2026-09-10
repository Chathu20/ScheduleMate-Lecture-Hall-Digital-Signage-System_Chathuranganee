import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const todaySessions = await prisma.session.findMany({
      where: { session_date: { gte: todayStart, lt: todayEnd } },
      include: { changes: { orderBy: { changed_at: 'desc' } } },
    });

    let ongoingCount = 0;
    let upcomingCount = 0;
    let cancelledCount = 0;
    let rescheduledCount = 0;

    for (const session of todaySessions) {
      if (session.status === 'CANCELLED') {
        cancelledCount++;
        continue;
      }
      if (session.status === 'RESCHEDULED') {
        rescheduledCount++;
        const latest = session.changes.find((c) => c.change_type === 'RESCHEDULE');
        if (latest?.new_start_time && latest?.new_end_time) {
          if (latest.new_start_time <= now && now < latest.new_end_time) ongoingCount++;
          else if (latest.new_start_time > now) upcomingCount++;
        }
        continue;
      }
      // ACTIVE
      if (session.start_time <= now && now < session.end_time) ongoingCount++;
      else if (session.start_time > now) upcomingCount++;
    }

    res.json({
      date: todayStart,
      ongoing: ongoingCount,
      upcoming: upcomingCount,
      cancelled: cancelledCount,
      rescheduled: rescheduledCount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to compute dashboard counts' });
  }
});

export default router;