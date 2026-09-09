import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.json({ message: "displays route placeholder" });
});

export default router;