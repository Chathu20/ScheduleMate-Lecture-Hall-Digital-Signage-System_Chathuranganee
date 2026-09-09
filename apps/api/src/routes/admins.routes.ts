import { Router } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/requireRole.middleware';

const router = Router();
router.use(authMiddleware);
router.use(requireRole('SUPER_ADMIN'));

// GET all admins
router.get('/', async (req, res) => {
  try {
    const admins = await prisma.admin.findMany({
      select: { admin_id: true, username: true, role: true, locked_until: true },
    });
    res.json(admins);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch admins' });
  }
});

// CREATE a new admin
router.post('/', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password || !role) {
      return res.status(400).json({ message: 'username, password, and role are required' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const admin = await prisma.admin.create({
      data: { username, password_hash, role },
      select: { admin_id: true, username: true, role: true },
    });
    res.status(201).json(admin);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'username already exists' });
    }
    console.error(error);
    res.status(500).json({ message: 'Failed to create admin' });
  }
});

// EDIT another admin (username/role — password reset handled separately later)
router.put('/:id', async (req, res) => {
  try {
    const { username, role } = req.body;
    const admin = await prisma.admin.update({
      where: { admin_id: Number(req.params.id) },
      data: { username, role },
      select: { admin_id: true, username: true, role: true },
    });
    res.json(admin);
  } catch (error) {
    console.error(error);
    res.status(404).json({ message: 'Admin not found' });
  }
});

// DELETE an admin
router.delete('/:id', async (req, res) => {
  try {
    await prisma.admin.delete({ where: { admin_id: Number(req.params.id) } });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(404).json({ message: 'Admin not found' });
  }
});

router.patch('/:id/deactivate', async (req, res) => {
  try {
    const admin = await prisma.admin.update({
      where: { admin_id: Number(req.params.id) },
      data: { is_active: false },
      select: { admin_id: true, username: true, is_active: true },
    });
    res.json(admin);
  } catch (error) {
    res.status(404).json({ message: 'Admin not found' });
  }
});

router.patch('/:id/reactivate', async (req, res) => {
  try {
    const admin = await prisma.admin.update({
      where: { admin_id: Number(req.params.id) },
      data: { is_active: true, failed_attempts: 0, locked_until: null },
      select: { admin_id: true, username: true, is_active: true },
    });
    res.json(admin);
  } catch (error) {
    res.status(404).json({ message: 'Admin not found' });
  }
});

export default router;