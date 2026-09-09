import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

const router = Router();

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const admin: any = await prisma.admin.findUnique({ where: { username } });

  if (!admin) {
    return res.status(401).json({ message: 'Invalid username or password' });
  }

  // Check if account is currently locked
  if (admin.locked_until && admin.locked_until > new Date()) {
    return res.status(403).json({ message: 'Account locked. Try again later.' });
  }

  const passwordMatches = await bcrypt.compare(password, admin.password_hash);

  if (!passwordMatches) {
    const newAttempts = admin.failed_attempts + 1;
    const shouldLock = newAttempts >= MAX_ATTEMPTS;

    await prisma.admin.update({
      where: { admin_id: admin.admin_id },
      data: {
        failed_attempts: newAttempts,
        locked_until: shouldLock ? new Date(Date.now() + LOCK_DURATION_MS) : admin.locked_until,
      },
    });

    return res.status(401).json({ message: 'Invalid username or password' });
  }

  // Successful login — reset lockout state
  await prisma.admin.update({
    where: { admin_id: admin.admin_id },
    data: { failed_attempts: 0, locked_until: null },
  });

  const token = jwt.sign(
    { admin_id: admin.admin_id, role: admin.role },
    process.env.JWT_SECRET as string,
    { expiresIn: '8h' }
  );

  return res.json({
    message: 'Login successful',
    token,
    admin: { admin_id: admin.admin_id, username: admin.username, role: admin.role },
  });
});

export default router;