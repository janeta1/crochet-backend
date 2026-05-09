import express from "express";
import db from "../db/database.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// GET /projects - implements pagination
router.get("/", authenticate, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    const projects = db
      .prepare("SELECT * FROM projects LIMIT ? OFFSET ?")
      .all(limit, offset);

    const total = db.prepare("SELECT COUNT(*) AS count FROM projects").get();

    const result = projects.map((project) => {
      const parts = db
        .prepare("SELECT * FROM parts WHERE project_id = ?")
        .all(project.id);
      const sessions = db
        .prepare("SELECT * FROM sessions WHERE project_id = ?")
        .all(project.id);
      const yarns = db
        .prepare(
          "SELECT yarns.* FROM yarns JOIN project_yarns ON yarns.id = project_yarns.yarn_id WHERE project_yarns.project_id = ?",
        )
        .all(project.id);

      return {
        ...project,
        is_favorite: Boolean(project.is_favorite),
        parts,
        sessions,
        yarns,
      };
    });

    res.json({ data: result, total: total.count, limit, offset });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /projects/:id
router.get("/:id", authenticate, (req, res) => {
  try {
    const project = db
      .prepare("SELECT * FROM projects WHERE id = ?")
      .get(req.params.id);

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const parts = db
      .prepare("SELECT * FROM parts WHERE project_id = ?")
      .all(project.id);
    const sessions = db
      .prepare("SELECT * FROM sessions WHERE project_id = ?")
      .all(project.id);
    const yarns = db
      .prepare(
        "SELECT yarns.* FROM yarns JOIN project_yarns ON yarns.id = project_yarns.yarn_id WHERE project_yarns.project_id = ?",
      )
      .all(project.id);

    res.json({
      ...project,
      is_favorite: Boolean(project.is_favorite),
      parts,
      sessions,
      yarns,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /projects - create new project
router.post("/", authenticate, requireAdmin, (req, res) => {
  try {
    const { name, hookSize, color, photo, status, parts, yarns } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Project name is required" });
    }

    const id = crypto.randomUUID();

    db.prepare(
      "INSERT INTO projects (id, name, hook_size, color, photo, status) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(
      id,
      name,
      hookSize || null,
      color || null,
      photo || null,
      status || "queued",
    );

    // insert parts
    if (parts && parts.length > 0) {
      parts.forEach((part) => {
        db.prepare(
          "INSERT INTO parts (id, project_id, name, quantity, total_rows, completed_rows) VALUES (?, ?, ?, ?, ?, ?)",
        ).run(
          crypto.randomUUID(),
          id,
          part.name,
          part.quantity || 1,
          part.totalRows || 0,
          part.completedRows || 0,
        );
      });
    }

    // insert yarns
    if (yarns && yarns.length > 0) {
      yarns.forEach((yarnId) => {
        db.prepare(
          "INSERT INTO project_yarns (project_id, yarn_id) VALUES (?, ?)",
        ).run(id, yarnId);
      });
    }

    const newProject = db
      .prepare("SELECT * FROM projects WHERE id = ?")
      .get(id);
    const projectParts = db
      .prepare("SELECT * FROM parts WHERE project_id = ?")
      .all(id);
    const projectYarns = db
      .prepare(
        "SELECT yarns.* FROM yarns JOIN project_yarns ON yarns.id = project_yarns.yarn_id WHERE project_yarns.project_id = ?",
      )
      .all(id);

    res.status(201).json({
      ...newProject,
      is_favorite: Boolean(newProject.is_favorite),
      parts: projectParts,
      sessions: [],
      yarns: projectYarns,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /projects/:id - update existing project
router.put("/:id", authenticate, requireAdmin, (req, res) => {
  try {
    const project = db
      .prepare("SELECT * FROM projects WHERE id = ?")
      .get(req.params.id);

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const {
      name,
      hookSize,
      color,
      photo,
      status,
      isFavorite,
      timeSpent,
      completedAt,
    } = req.body;

    db.prepare(
      "UPDATE projects SET name = ?, hook_size = ?, color = ?, photo = ?, status = ?, is_favorite = ?, time_spent = ?, completed_at = ? WHERE id = ?",
    ).run(
      name !== undefined ? name : project.name,
      hookSize !== undefined ? hookSize : project.hook_size,
      color !== undefined ? color : project.color,
      photo !== undefined ? photo : project.photo,
      status !== undefined ? status : project.status,
      isFavorite !== undefined ? (isFavorite ? 1 : 0) : project.is_favorite,
      timeSpent !== undefined ? timeSpent : project.time_spent,
      completedAt || project.completed_at,
      req.params.id,
    );

    if (req.body.parts) {
      // delete existing parts
      db.prepare("DELETE FROM parts WHERE project_id = ?").run(req.params.id);
      req.body.parts.forEach((part) => {
        db.prepare(
          "INSERT INTO parts (id, project_id, name, quantity, total_rows, completed_rows) VALUES (?, ?, ?, ?, ?, ?)",
        ).run(
          part.id || crypto.randomUUID(),
          req.params.id,
          part.name,
          part.quantity || 1,
          part.totalRows || 0,
          part.completedRows || 0,
        );
      });
    }

    if (req.body.yarns) {
      // delete existing yarn associations
      db.prepare("DELETE FROM project_yarns WHERE project_id = ?").run(req.params.id);
      req.body.yarns.forEach((yarnId) => {
        db.prepare(
          "INSERT INTO project_yarns (project_id, yarn_id) VALUES (?, ?)",
        ).run(req.params.id, yarnId);
      });
    }

    const updated = db
      .prepare("SELECT * FROM projects WHERE id = ?")
      .get(req.params.id);
    const parts = db
      .prepare("SELECT * FROM parts WHERE project_id = ?")
      .all(req.params.id);
    const sessions = db
      .prepare("SELECT * FROM sessions WHERE project_id = ?")
      .all(req.params.id);
    const yarns = db
      .prepare(
        "SELECT yarns.* FROM yarns JOIN project_yarns ON yarns.id = project_yarns.yarn_id WHERE project_yarns.project_id = ?",
      )
      .all(req.params.id);

    res.json({
      ...updated,
      is_favorite: Boolean(updated.is_favorite),
      parts,
      sessions,
      yarns,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /projects/:id - delete project
router.delete("/:id", authenticate, requireAdmin, (req, res) => {
  try {
    const project = db
      .prepare("SELECT * FROM projects WHERE id = ?")
      .get(req.params.id);

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    db.prepare("DELETE FROM projects WHERE id = ?").run(req.params.id);

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
