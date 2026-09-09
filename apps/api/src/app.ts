import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes";
import buildingsRoutes from "./routes/buildings.routes";
import lecturersRoutes from "./routes/lecturers.routes";
import modulesRoutes from "./routes/modules.routes";
import sessionsRoutes from "./routes/sessions.routes";
import displaysRoutes from "./routes/displays.routes";
import adminsRoutes from "./routes/admins.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/buildings", buildingsRoutes);
app.use("/api/lecturers", lecturersRoutes);
app.use("/api/modules", modulesRoutes);
app.use("/api/sessions", sessionsRoutes);
app.use("/api/displays", displaysRoutes);
app.use("/api/admins", adminsRoutes);

export default app;