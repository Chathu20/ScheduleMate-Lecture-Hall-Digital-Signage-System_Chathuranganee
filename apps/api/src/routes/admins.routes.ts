import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.json({ message: "admins route placeholder" });
});

export default router;