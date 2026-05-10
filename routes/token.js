import express from "express";
import jwt from "jsonwebtoken";

const router = express.Router();

/**
 * @swagger
 * /token:
 *   post:
 *     summary: Generate a JWT token for authentication
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [admin, visitor]
 *                 example: visitor
 *     responses:
 *       200:
 *         description: Token generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 role:
 *                   type: string
 *                 expiresIn:
 *                   type: string
 *                   example: 1 minute
 *       400:
 *         description: Invalid role specified
 */
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
