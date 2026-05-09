import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import db from "./db/database.js";
import tokenRouter from "./routes/token.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors()); // Cross-Origin Resource Sharing
app.use(express.json()); // Parse JSON bodies

// Routes
app.use("/token", tokenRouter);

app.get("/", (req, res) => {
  res.json({ message: "Stitchbook API is running!" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
