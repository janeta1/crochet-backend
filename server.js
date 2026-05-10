import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import db from "./db/database.js";
import tokenRoutes from "./routes/token.js";
import projectsRoutes from "./routes/projects.js";
import sessionsRoutes from "./routes/sessions.js";
import yarnsRoutes from "./routes/yarns.js";
import swagger from "./swagger.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors()); // Cross-Origin Resource Sharing
app.use(express.json()); // Parse JSON bodies

// Routes
app.use("/token", tokenRoutes);
app.use("/projects", projectsRoutes);
app.use("/sessions", sessionsRoutes);
app.use("/yarns", yarnsRoutes);

// Swagger API documentation
app.use("/api-docs", swagger.swaggerUi.serve, swagger.swaggerUi.setup(swagger.swaggerSpec));

app.get("/", (req, res) => {
  res.json({ message: "Stitchbook API is running!" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API documentation available at http://localhost:${PORT}/api-docs`);
});
