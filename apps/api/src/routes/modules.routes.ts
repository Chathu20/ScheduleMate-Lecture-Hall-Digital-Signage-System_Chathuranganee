import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.json({ message: "modules route placeholder" });
});

export default router;