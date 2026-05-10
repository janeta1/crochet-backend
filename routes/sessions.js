import express from "express";
import db from "../db/database.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// GET /sessions - implements pagination
router.get("/", authenticate, (req, res) => {
  try {
    const { projectId } = req.query; // get query parameters
    const limit = parseInt(req.query.limit) || 10; // default limit
    const offset = parseInt(req.query.offset) || 0; // default offset

    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" });
    }

    const sessions = db
      .prepare(
        "SELECT * FROM sessions WHERE project_id = ? ORDER BY date DESC LIMIT ? OFFSET ?",
      )
      .all(projectId, limit, offset);

    const total = db
      .prepare("SELECT COUNT(*) AS count FROM sessions WHERE project_id = ?")
      .get(projectId);

    res.json({ data: sessions, total: total.count, limit, offset });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /sessions - create a new session
router.post("/", authenticate, requireAdmin, (req, res) => {
  try {
    const { projectId, date, duration, note, partUpdates } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" });
    }

    if (!date) {
      return res.status(400).json({ error: "date is required" });
    }

    const project = db
      .prepare("SELECT * FROM projects WHERE id = ?")
      .get(projectId);

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const id = crypto.randomUUID();

    db.prepare(
      "INSERT INTO sessions (id, project_id, date, duration, note) VALUES (?, ?, ?, ?, ?)",
    ).run(id, projectId, date, duration, note);

    // update time spent on project
    db.prepare(
      "UPDATE projects SET time_spent = time_spent + ? WHERE id = ?",
    ).run(duration || 0, projectId);

    // update completed row for each part
    if (partUpdates && Object.keys(partUpdates).length > 0) {
      Object.entries(partUpdates).forEach(([partId, rowsAdded]) => {
        if (rowsAdded != 0) {
          db.prepare(
            "UPDATE parts SET completed_rows = completed_rows + ? WHERE id = ? AND project_id = ?",
          ).run(rowsAdded, partId, projectId);
        }
      });
    }

    const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(id);
    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /sessions/:id - delete a session
router.delete("/:id", authenticate, requireAdmin, (req, res) => {
    try {
        const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(req.params.id);

        if (!session) {
            return res.status(404).json({ error: "Session not found" });
        }

        // subtract time spent on project
        db.prepare(
            "UPDATE projects SET time_spent = time_spent - ? WHERE id = ?",
        ).run(session.duration || 0, session.project_id);

        db.prepare("DELETE FROM sessions WHERE id = ?").run(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
})

export default router;