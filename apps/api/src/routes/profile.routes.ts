import { Router } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: AuthenticatedRequest, res) => {
  const admin = await prisma.admin.findUnique({
    where: { admin_id: req.admin!.admin_id },
    select: { admin_id: true, username: true, role: true, is_active: true },
  });
  res.json(admin);
});

router.put('/', async (req: AuthenticatedRequest, res) => {
  const { username, currentPassword, newPassword } = req.body;
  const admin = await prisma.admin.findUnique({ where: { admin_id: req.admin!.admin_id } });
  if (!admin) return res.status(404).json({ message: 'Admin not found' });

  const data: any = {};
  if (username) data.username = username;

  if (newPassword) {
    if (!currentPassword) {
      return res.status(400).json({ message: 'currentPassword is required to set a new password' });
    }
    const matches = await bcrypt.compare(currentPassword, admin.password_hash);
    if (!matches) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    data.password_hash = await bcrypt.hash(newPassword, 10);
  }

  try {
    const updated = await prisma.admin.update({
      where: { admin_id: admin.admin_id },
      data,
      select: { admin_id: true, username: true, role: true },
    });
    res.json(updated);
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(409).json({ message: 'username already exists' });
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

export default router;