import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";

const router = Router();

router.get("/", (req, res) => {
  res.json({ message: "auth route working" });
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        message: "Username and password are required",
      });
    }

    const admin = await prisma.admin.findUnique({
      where: {
        username,
      },
    });

    if (!admin) {
      return res.status(401).json({
        message: "Invalid username or password",
      });
    }

    // Check whether the account is deactivated
    if (!admin.is_active) {
      return res.status(403).json({
        message: "Account is deactivated",
      });
    }

    // Check whether the account is currently locked
    if (admin.locked_until && admin.locked_until > new Date()) {
      return res.status(403).json({
        message: "Account locked. Try again later.",
      });
    }

    // Check password
    const passwordValid = await bcrypt.compare(
      password,
      admin.password_hash
    );

    // Wrong password
    if (!passwordValid) {
      const newFailedAttempts = admin.failed_attempts + 1;

      // Lock account after 5 consecutive failed attempts
      if (newFailedAttempts >= 5) {
        const lockedUntil = new Date(Date.now() + 15 * 60 * 1000);

        await prisma.admin.update({
          where: {
            admin_id: admin.admin_id,
          },
          data: {
            failed_attempts: newFailedAttempts,
            locked_until: lockedUntil,
          },
        });

        return res.status(401).json({
          message: "Invalid username or password",
        });
      }

      await prisma.admin.update({
        where: {
          admin_id: admin.admin_id,
        },
        data: {
          failed_attempts: newFailedAttempts,
        },
      });

      return res.status(401).json({
        message: "Invalid username or password",
      });
    }

    // Successful login resets failed attempts
    await prisma.admin.update({
      where: {
        admin_id: admin.admin_id,
      },
      data: {
        failed_attempts: 0,
        locked_until: null,
      },
    });

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      return res.status(500).json({
        message: "JWT_SECRET is not configured",
      });
    }

    const token = jwt.sign(
      {
        admin_id: admin.admin_id,
        username: admin.username,
        role: admin.role,
      },
      jwtSecret,
      {
        expiresIn: "1h",
      }
    );

    return res.json({
      message: "Login successful",
      token,
      admin: {
        admin_id: admin.admin_id,
        username: admin.username,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

export default router;