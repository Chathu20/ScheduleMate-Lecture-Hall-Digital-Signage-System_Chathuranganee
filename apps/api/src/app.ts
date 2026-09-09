import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes";
import buildingsRoutes from "./routes/buildings.routes";
import lecturersRoutes from "./routes/lecturers.routes";
import modulesRoutes from "./routes/modules.routes";
import sessionsRoutes from "./routes/sessions.routes";
import displaysRoutes from "./routes/displays.routes";
import adminsRoutes from "./routes/admins.routes";
import floorsRoutes from "./routes/floors.routes";
import sidesRoutes from "./routes/sides.routes";
import roomsRoutes from "./routes/rooms.routes";
import profileRoutes from "./routes/profile.routes";

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
app.use("/api/floors", floorsRoutes);
app.use("/api/sides", sidesRoutes);
app.use("/api/rooms", roomsRoutes);
app.use('/api/profile', profileRoutes);

export default app;