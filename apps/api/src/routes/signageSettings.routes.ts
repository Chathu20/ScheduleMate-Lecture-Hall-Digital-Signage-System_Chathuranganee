import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware);

const DEFAULTS = {
  side_duration_seconds: 8,
  poll_interval_seconds: 30,
  upcoming_soon_threshold_min: 15,
  max_upcoming_per_slide: 5,
  institution_name: 'Sparkline Academy',
};

async function getOrCreateSettings() {
  return prisma.signageSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, ...DEFAULTS },
  });
}

router.get('/', async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    res.json(settings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch signage settings' });
  }
});

router.put('/', async (req, res) => {
  try {
    const {
      side_duration_seconds,
      poll_interval_seconds,
      upcoming_soon_threshold_min,
      max_upcoming_per_slide,
      institution_name,
    } = req.body;

    await getOrCreateSettings();

    const settings = await prisma.signageSettings.update({
      where: { id: 1 },
      data: {
        side_duration_seconds,
        poll_interval_seconds,
        upcoming_soon_threshold_min,
        max_upcoming_per_slide,
        institution_name,
      },
    });

    res.json(settings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update signage settings' });
  }
});

router.post('/reset', async (req, res) => {
  try {
    const settings = await prisma.signageSettings.upsert({
      where: { id: 1 },
      update: DEFAULTS,
      create: { id: 1, ...DEFAULTS },
    });
    res.json(settings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to reset signage settings' });
  }
});

export default router;
