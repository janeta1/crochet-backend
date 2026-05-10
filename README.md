# Stitchbook API 🧶

REST API for Stitchbook — a crochet project manager app. Handles projects, yarn stash, and session logging with JWT authentication.

## Live Frontend

[Stitchbook](https://janeta1.github.io/crochet-app/#/projects)

## Features

### Projects
- **Full CRUD** for crochet projects
- Nested **parts** tracking (rows and pieces)
- **Session logging** with notes, duration and part progress updates
- Support for frogging (negative row updates)
- Link yarns from the stash to projects
- **Pagination** support on all list endpoints

### Yarn Stash
- **Full CRUD** for yarn collection
- Track brand, weight, color and quantity
- Link yarns to projects via junction table

### Auth
- JWT-based authentication via `/token` endpoint
- Role-based access (`admin` / `visitor`)
- Tokens expire in 1 minute (for demo purposes)

### Docs
- Full Swagger UI documentation at `/api-docs`

## Tech Stack
- Node.js + Express
- SQLite (via better-sqlite3)
- JWT (via jsonwebtoken)
- Swagger UI (via swagger-ui-express + swagger-jsdoc)

## Getting Started

```bash
git clone https://github.com/janeta1/crochet-backend.git
cd crochet-backend
npm install
```

Create a `.env` file in the root:
```
JWT_SECRET=your_secret_here
PORT=3000
```

Run the server:
```bash
npm run dev
```

API will be available at `http://localhost:3000`  
Swagger docs at `http://localhost:3000/api-docs`

## API Overview

```
POST   /token                      → get JWT

GET    /projects                   → list all projects (paginated)
GET    /projects/:id               → get one project
POST   /projects                   → create project
PUT    /projects/:id               → full update
PATCH  /projects/:id               → update status / favorite
DELETE /projects/:id               → delete project

GET    /sessions                   → get sessions for a project
POST   /sessions                   → log a session
DELETE /sessions/:id               → delete a session

GET    /yarns                      → list all yarns (paginated)
GET    /yarns/:id                  → get one yarn
POST   /yarns                      → create yarn
PUT    /yarns/:id                  → full update
PATCH  /yarns/:id                  → toggle favorite
DELETE /yarns/:id                  → delete yarn
```

## Project Structure
```
├── routes/
│   ├── projects.js    # Project CRUD endpoints
│   ├── sessions.js    # Session endpoints
│   ├── yarns.js       # Yarn CRUD endpoints
│   └── token.js       # JWT token endpoint
├── middleware/
│   └── auth.js        # JWT authentication + admin check
├── db/
│   └── database.js    # SQLite setup and schema
└── swagger.js         # Swagger configuration
```