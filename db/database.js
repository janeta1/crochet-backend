import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, "stitchbook.db"));

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON"); // Enable foreign key constraints

db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        hook_size TEXT,
        color TEXT,
        photo TEXT,
        status TEXT DEFAULT 'queued',
        is_favorite INTEGER DEFAULT 0,
        time_spent INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS parts (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        total_rows INTEGER DEFAULT 0,
        completed_rows INTEGER DEFAULT 0,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        date TEXT NOT NULL,
        duration INTEGER DEFAULT 0,
        note TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS yarns (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        brand TEXT,
        color TEXT,
        weight TEXT,
        quantity INTEGER DEFAULT 0,
        is_favorite INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS project_yarns (
        project_id TEXT NOT NULL,
        yarn_id TEXT NOT NULL,
        PRIMARY KEY (project_id, yarn_id),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (yarn_id) REFERENCES yarns(id) ON DELETE CASCADE
    );
`);

export default db;
