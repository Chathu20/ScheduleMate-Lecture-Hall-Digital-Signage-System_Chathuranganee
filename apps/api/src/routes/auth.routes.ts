
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

    const passwordValid = await bcrypt.compare(
      password,
      admin.password_hash
    );

    if (!passwordValid) {
      return res.status(401).json({
        message: "Invalid username or password",
      });
    }

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

