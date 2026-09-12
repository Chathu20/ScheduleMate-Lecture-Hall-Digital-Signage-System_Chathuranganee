import { Router } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.middleware';
import { profilePhotoUpload, deleteProfilePhotoFile } from '../lib/upload';

const router = Router();
router.use(authMiddleware);

const PROFILE_SELECT = { admin_id: true, username: true, email: true, role: true, is_active: true, profile_photo: true };

router.get('/', async (req: AuthenticatedRequest, res) => {
  const admin = await prisma.admin.findUnique({
    where: { admin_id: req.admin!.admin_id },
    select: PROFILE_SELECT,
  });
  res.json(admin);
});

router.put('/', async (req: AuthenticatedRequest, res) => {
  const { username, email, currentPassword, newPassword } = req.body;
  const admin = await prisma.admin.findUnique({ where: { admin_id: req.admin!.admin_id } });
  if (!admin) return res.status(404).json({ message: 'Admin not found' });

  const data: any = {};
  if (username) data.username = username;
  if (email !== undefined) data.email = email;

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
      select: PROFILE_SELECT,
    });
    res.json(updated);
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(409).json({ message: 'username or email already exists' });
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

router.post('/photo', profilePhotoUpload.single('photo'), async (req: AuthenticatedRequest, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No photo file was provided' });
  }

  try {
    const existing = await prisma.admin.findUnique({ where: { admin_id: req.admin!.admin_id } });
    const photoUrl = `/uploads/profile-photos/${req.file.filename}`;

    const updated = await prisma.admin.update({
      where: { admin_id: req.admin!.admin_id },
      data: { profile_photo: photoUrl },
      select: PROFILE_SELECT,
    });

    if (existing?.profile_photo) {
      deleteProfilePhotoFile(existing.profile_photo);
    }

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to save profile photo' });
  }
});

router.delete('/photo', async (req: AuthenticatedRequest, res) => {
  try {
    const existing = await prisma.admin.findUnique({ where: { admin_id: req.admin!.admin_id } });

    const updated = await prisma.admin.update({
      where: { admin_id: req.admin!.admin_id },
      data: { profile_photo: null },
      select: PROFILE_SELECT,
    });

    if (existing?.profile_photo) {
      deleteProfilePhotoFile(existing.profile_photo);
    }

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to remove profile photo' });
  }
});

// Surfaces multer errors (oversized file, disallowed type) as a clean 400
// instead of falling through to Express's default HTML error page.
router.use((err: any, req: AuthenticatedRequest, res: any, next: any) => {
  if (err) {
    return res.status(400).json({ message: err.message || 'Failed to upload photo' });
  }
  next();
});

export default router;
