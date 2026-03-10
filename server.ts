import express from "express";
import { createServer as createViteServer } from "vite";
import { setupDatabase } from "./backend/db.js";
import { startSimulator } from "./backend/collectors/simulator.js";
import { runDetection } from "./backend/models/detector.js";
import { generateRecommendations } from "./backend/optimization_agent/optimizer.js";
import { runPreventiveGuard } from "./backend/models/preventive_guard.js";
import apiRoutes from "./backend/api/routes.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Database
  setupDatabase();
  console.log("[CloudGuard] Database initialized");

  // Start Background Tasks
  startSimulator();

  // Detection pipeline: run after metrics accumulate
  setTimeout(runDetection, 5000);
  setInterval(runDetection, 60000);

  // Optimization Agent: generate AI recommendations
  setTimeout(generateRecommendations, 10000);
  setInterval(generateRecommendations, 120000);

  // Preventive Cost Guard: predict future waste
  setTimeout(() => runPreventiveGuard(), 15000);
  setInterval(() => runPreventiveGuard(), 180000);

  // API Routes
  app.use("/api", apiRoutes);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[CloudGuard] Server running on http://localhost:${PORT}`);
  });
}

startServer();
