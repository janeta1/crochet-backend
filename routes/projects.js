import express from "express";
import db from "../db/database.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

/**
 * @swagger
 * /projects:
 *   get:
 *     summary: Get all projects (paginated)
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           example: 0
 *     responses:
 *       200:
 *         description: List of projects
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 offset:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
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

/**
 * @swagger
 * /projects/{id}:
 *   get:
 *     summary: Get project by ID
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project found
 *       404:
 *         description: Project not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
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

/**
 * @swagger
 * /projects:
 *   post:
 *     summary: Create a new project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Granny Square Blanket
 *               hookSize:
 *                 type: string
 *                 example: 5mm
 *               color:
 *                 type: string
 *                 example: "#C4A0A0"
 *               status:
 *                 type: string
 *                 enum: [queued, in_progress, done]
 *                 example: queued
 *               parts:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *                     totalRows:
 *                       type: integer
 *                     completedRows:
 *                       type: integer
 *               yarns:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: []
 *     responses:
 *       201:
 *         description: Project created successfully
 *       400:
 *         description: Project name is required
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 */
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

/**
 * @swagger
 * /projects/{id}:
 *   put:
 *     summary: Update an existing project (full update)
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               hookSize:
 *                 type: string
 *               color:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [queued, in-progress, done]
 *               isFavorite:
 *                 type: boolean
 *               parts:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *                     totalRows:
 *                       type: integer
 *                     completedRows:
 *                       type: integer
 *               yarns:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: []
 *     responses:
 *       200:
 *         description: Project updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Project not found
 *       500:
 *         description: Internal server error
 */
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
      completedAt !== undefined ? completedAt : project.completed_at,
      req.params.id,
    );

    if (req.body.parts && req.body.parts.length > 0) {
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
          parseInt(part.totalRows) || 0,
          parseInt(part.completedRows) || 0,
        );
      });
    }

    if (req.body.yarns && req.body.yarns.length > 0) {
      // delete existing yarn associations
      db.prepare("DELETE FROM project_yarns WHERE project_id = ?").run(
        req.params.id,
      );
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
    console.error("PUT /projects/:id error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /projects/{id}:
 *   patch:
 *     summary: Partial update (status, favorite, completed at)
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [queued, in-progress, done]
 *               isFavorite:
 *                 type: boolean
 *               completedAt:
 *                 type: string
 *                 example: "2026-05-10T12:00:00Z"
 *     responses:
 *       200:
 *         description: Project updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Project not found
 *       500:
 *         description: Internal server error
 */
// PATCH /projects/:id - partial updates (status change, mark as favorite, update completed at)
router.patch("/:id", authenticate, requireAdmin, (req, res) => {
  try {
    const project = db
      .prepare("SELECT * FROM projects WHERE id = ?")
      .get(req.params.id);

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const { status, isFavorite, completedAt } = req.body;

    db.prepare(
      "UPDATE projects SET status = ?, is_favorite = ?, completed_at = ? WHERE id = ?",
    ).run(
      status !== undefined ? status : project.status,
      isFavorite !== undefined ? (isFavorite ? 1 : 0) : project.is_favorite,
      completedAt !== undefined ? completedAt : project.completed_at,
      req.params.id,
    );

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

/**
 * @swagger
 * /projects/{id}:
 *   delete:
 *     summary: Delete a project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Project deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Project not found
 *       500:
 *         description: Internal server error
 */
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
