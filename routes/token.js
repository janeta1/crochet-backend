import express from "express";
import jwt from "jsonwebtoken";

const router = express.Router();

// POST /token
router.post("/", (req, res) => {
  try {
    const { role } = req.body;

    const validRoles = ["admin", "visitor"];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ error: "Invalid role specified" });
    }

    const payload = {
      role: role || "visitor", // default to visitor if no role provided
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1m",
    });

    res.json({ token, role: payload.role, expiresIn: "1 minute" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
