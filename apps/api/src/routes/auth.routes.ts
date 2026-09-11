import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
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

// STEP 1: request a password reset link
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "email is required" });
    }

    const admin = await prisma.admin.findUnique({ where: { email } });

    // Always respond the same way whether or not the email exists,
    // so we don't leak which addresses have admin accounts.
    if (admin) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.admin.update({
        where: { admin_id: admin.admin_id },
        data: { reset_token_hash: tokenHash, reset_token_expires: expires },
      });

      const resetLink = `${process.env.ADMIN_WEB_URL || "http://localhost:5173"}/reset-password?email=${encodeURIComponent(email)}&token=${rawToken}`;

      // No email transport is configured for this project, so the reset
      // link is logged to the server console instead of being emailed.
      console.log(`[forgot-password] Reset link for ${email}: ${resetLink}`);
    }

    return res.json({ message: "If that email exists, a reset link has been sent." });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// STEP 2: consume the token and set a new password
router.post("/reset-password", async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;
    if (!email || !token || !newPassword) {
      return res.status(400).json({ message: "email, token, and newPassword are required" });
    }

    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin || !admin.reset_token_hash || !admin.reset_token_expires) {
      return res.status(400).json({ message: "Invalid or expired reset link" });
    }

    if (admin.reset_token_expires < new Date()) {
      return res.status(400).json({ message: "Invalid or expired reset link" });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    if (tokenHash !== admin.reset_token_hash) {
      return res.status(400).json({ message: "Invalid or expired reset link" });
    }

    const password_hash = await bcrypt.hash(newPassword, 10);
    await prisma.admin.update({
      where: { admin_id: admin.admin_id },
      data: {
        password_hash,
        reset_token_hash: null,
        reset_token_expires: null,
        failed_attempts: 0,
        locked_until: null,
      },
    });

    return res.json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;