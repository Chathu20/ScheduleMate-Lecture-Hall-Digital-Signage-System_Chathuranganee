import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.json({ message: "sessions route placeholder" });
});

export default router;