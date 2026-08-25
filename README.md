# BrainArena

Interactive quiz and real-time performance analysis platform inspired by Kahoot.

> Kahoot tells the student what their score is. BrainArena tells the student **why** they got that score, where they lost, how they performed against others, and what they should improve.

## Architecture

```
frontend/  React 19 + Vite 8 + TypeScript + Tailwind CSS v4 (Recharts, Socket.IO client, Axios)
backend/   Node.js + Express + TypeScript (Mongoose, Socket.IO, JWT, zod)
database/  MongoDB Atlas (persistent). Connection via `MONGO_URI` in `backend/.env` (required).
AI/        Gemini or OpenAI (optional, enabled from Phase 12)
```

- **REST** (`/api`) for all non-real-time operations.
- **Socket.IO** (`/socket.io`) for the live quiz engine (server-authoritative scoring/timing/rankings).

## Design system

A shared UI foundation in `frontend/src/components/ui/` + `frontend/src/index.css`:

- **Fonts** — Inter (body), Sora (display), JetBrains Mono (PINs/countdowns) via Google Fonts.
- **Theme tokens** — `brand` (indigo), `surface` (slate) color scales; card shadows, glow, and animation keyframes (fade-up, scale-in, float) declared as Tailwind v4 `@theme` tokens.
- **Utilities** — `text-gradient`, `card-surface`, `card-hover`, `input-field`, `btn-primary`, `btn-secondary`, `btn-ghost`, `chip` for consistent styling.
- **Components** — `Button`, `Card`, `Badge`, `Spinner`, `Logo`, and a full inline SVG icon set (`icons.tsx`).
- **Layouts** — `TeacherLayout` (sidebar nav) and `StudentLayout` (top bar) keep navigation and auth state consistent across roles.

## Prerequisites

- Node.js >= 20 (tested on v24)
- npm

A MongoDB connection string is required. Set `MONGO_URI` in `backend/.env` (e.g. a MongoDB Atlas cluster or a local `mongodb://localhost:27017/brainarena`).

## Backend

```bash
cd backend
npm install
cp .env.example .env      # first time; adjust as needed
npm run dev               # http://localhost:5000
```

Verify: `http://localhost:5000/api/health` returns `{"status":"ok","database":"connected",...}`.

Other commands: `npm run build` (compile), `npm run typecheck`, `npm run start` (run compiled output).

## Frontend

```bash
cd frontend
npm install
npm run dev               # http://localhost:5173
```

The Vite dev server proxies `/api` and `/socket.io` to the backend on port 5000.

Verify: open `http://localhost:5173` — the home page shows a live backend/database status banner.

## Testing

Backend integration test scripts (run from `backend/` with the server running on :5000). Each uses unique emails per run against the configured MongoDB.

```bash
node test-live-quiz.mjs    # live Socket.IO quiz -> scoring, analytics, reports
node test-import.mjs       # CSV/XLSX upload validation + apply to quiz/bank
node test-bank.mjs         # question bank CRUD, reuse in quizzes, safe removal
node test-ai.mjs           # AI config + topic/material question generation
node test-material.mjs     # PDF/TXT material text extraction + material-based generation
node test-export.mjs       # CSV/Excel/PDF export endpoints
```

Frontend: `npm run typecheck` and `npm run build` in `frontend/`.

## Environment variables

Backend (`backend/.env`) — see `.env.example`:

| Variable | Purpose |
|---|---|
| `PORT` | API port (default 5000) |
| `NODE_ENV` | `development` / `test` / `production` |
| `MONGO_URI` | MongoDB connection string (required). Atlas or local |
| `JWT_SECRET` | JWT signing secret (>= 16 chars) |
| `JWT_EXPIRES_IN` | Token lifetime (default 7d) |
| `CORS_ORIGIN` / `FRONTEND_URL` | Allowed frontend origins |
| `AI_PROVIDER` | `none` (default) / `gemini` / `openai` / `mock` (demo, no key) |
| `GEMINI_API_KEY` / `OPENAI_API_KEY` | Keys for AI features (Phase 12/13) |

Frontend: no keys required. `VITE_API_URL` / `VITE_SOCKET_URL` override the default same-origin `/api` / `/socket.io` in production deployments.

## Development phases

| Phase | Scope |
|---|---|
| 1 | Project setup and architecture ✔ |
| 2 | Database models ✔ |
| 3 | Authentication and role management ✔ |
| 4 | Teacher dashboard ✔ |
| 5 | Quiz creation and manual question management ✔ |
| 6 | Student dashboard and Game PIN joining ✔ |
| 7 | Socket.IO live quiz engine ✔ |
| 8 | Answer validation, scoring, leaderboard ✔ |
| 9 | Performance analytics ✔ |
| 10 | Question upload and validation (CSV/Excel) ✔ |
| 11 | Question bank ✔ |
| 12 | AI question generation ✔ |
| 13 | AI generation from learning materials ✔ |
| 14 | Teacher analytics and reports ✔ |
| 15 | Student progress and personalized insights ✔ |
| 16 | Export and final testing ✔ |
