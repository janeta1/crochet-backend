import express from "express";
import db from "../db/database.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// GET /yarns - implements pagination
router.get("/", authenticate, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10; // default limit
    const offset = parseInt(req.query.offset) || 0; // default offset

    const yarns = db
      .prepare("SELECT * FROM yarns LIMIT ? OFFSET ?")
      .all(limit, offset);

    const total = db.prepare("SELECT COUNT(*) AS count FROM yarns").get();

    res.json({
      data: yarns.map((y) => ({ ...y, is_favorite: Boolean(y.is_favorite) })),
      total: total.count,
      limit,
      offset,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /yarns/:id
router.get("/:id", authenticate, (req, res) => {
  try {
    const yarn = db
      .prepare("SELECT * FROM yarns WHERE id = ?")
      .get(req.params.id);

    if (!yarn) {
      return res.status(404).json({ error: "Yarn not found" });
    }

    res.json({ ...yarn, is_favorite: Boolean(yarn.is_favorite) });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /yarns - create a new yarn
router.post("/", authenticate, requireAdmin, (req, res) => {
  try {
    const { name, brand, color, weight, quantity } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Yarn name is required" });
    }

    const id = crypto.randomUUID();

    db.prepare(
      "INSERT INTO yarns (id, name, brand, color, weight, quantity) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(
      id,
      name,
      brand || null,
      color || null,
      weight || null,
      quantity || 0,
    );

    const yarn = db.prepare("SELECT * FROM yarns WHERE id = ?").get(id);

    res.status(201).json({ ...yarn, is_favorite: Boolean(yarn.is_favorite) });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /yarns/:id - update a yarn
router.put("/:id", authenticate, requireAdmin, (req, res) => {
  try {
    const yarn = db
      .prepare("SELECT * FROM yarns WHERE id = ?")
      .get(req.params.id);

    if (!yarn) {
      return res.status(404).json({ error: "Yarn not found" });
    }

    const { name, brand, color, weight, quantity } = req.body;

    db.prepare(
      "UPDATE yarns SET name = ?, brand = ?, color = ?, weight = ?, quantity = ? WHERE id = ?",
    ).run(
      name !== undefined ? name : yarn.name,
      brand !== undefined ? brand : yarn.brand,
      color !== undefined ? color : yarn.color,
      weight !== undefined ? weight : yarn.weight,
      quantity !== undefined ? quantity : yarn.quantity,
      req.params.id,
    );

    const updatedYarn = db
      .prepare("SELECT * FROM yarns WHERE id = ?")
      .get(req.params.id);

    res.json({ ...updatedYarn, is_favorite: Boolean(updatedYarn.is_favorite) });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /yarns/:id - partial update (toggle favorite)
router.patch("/:id", authenticate, requireAdmin, (req, res) => {
  try {
    const yarn = db
      .prepare("SELECT * FROM yarns WHERE id = ?")
      .get(req.params.id);

    if (!yarn) {
      return res.status(404).json({ error: "Yarn not found" });
    }

    const { isFavorite } = req.body;

    db.prepare("UPDATE yarns SET is_favorite = ? WHERE id = ?").run(
      isFavorite !== undefined ? (isFavorite ? 1 : 0) : yarn.is_favorite,
      req.params.id
    );

    const updatedYarn = db
      .prepare("SELECT * FROM yarns WHERE id = ?")
      .get(req.params.id);

    res.json({ ...updatedYarn, is_favorite: Boolean(updatedYarn.is_favorite) });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /yarns/:id - delete a yarn
router.delete("/:id", authenticate, requireAdmin, (req, res) => {
    try {
        const yarn = db.prepare("SELECT * FROM yarns WHERE id = ?").get(req.params.id);

        if (!yarn) {
            return res.status(404).json({ error: "Yarn not found" });
        }

        db.prepare("DELETE FROM yarns WHERE id = ?").run(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
})

export default router;
