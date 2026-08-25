# BrainArena — GitHub Pages Deploy Guide

This project is frontend (Vite + React) + backend (Express + MongoDB).  
**GitHub Pages only hosts the frontend** (static). Backend must be hosted separately.

## Host link
After deploy, your site will be at:
```
https://<YOUR_GITHUB_USERNAME>.github.io/BrainArena_Quiz_Game/
```
Example: if your GitHub username is `vijayaragavan4818`, the link is `https://vijayaragavan4818.github.io/BrainArena_Quiz_Game/`

## 1) Create GitHub repo
1. Go to https://github.com/new
2. Repo name: `BrainArena_Quiz_Game` (must match — we configured `vite.config.ts:6` base `/BrainArena_Quiz_Game/`)
3. Visibility: Public
4. Do NOT init with README

## 2) Push this project (run in PowerShell from project root)

> Git is not installed in this automation env — run these on your own machine where Git is installed.

```powershell
cd C:\Users\ELCOT\OneDrive\Documents\Terv_Project

git init
git add .
git commit -m "feat: BrainArena — dark gaming + media + theme toggle + Pages deploy"

# replace <USERNAME> with your GitHub username
git branch -M main
git remote add origin https://github.com/<USERNAME>/BrainArena.git
git push -u origin main
```

## 3) Enable GitHub Pages (one-time)
1. On GitHub, open your repo → Settings → Pages
2. Build and deployment → Source: `GitHub Actions`
3. Push already triggers `.github/workflows/deploy.yml:1` — frontend builds on every `push to main`
4. After push, check Actions tab → green check → Pages URL appears in Settings → Pages

The workflow does:
- `npm ci` in `frontend/`
- `npm run build` with `GITHUB_PAGES=true` (sets base `/BrainArena_Quiz_Game/` and basename via `App.tsx:28`)
- Copies `dist/index.html` → `dist/404.html` for SPA routing (fixes refresh 404)
- Publishes `frontend/dist` to Pages

## 4) Auto-update on changes
Every time you edit and push:
```powershell
git add .
git commit -m "update: ..."
git push
```
GitHub Actions rebuilds and redeploys automatically. The host link stays the same, content updates in ~1-2 min.

## 5) Backend for production
Pages cannot run Node/Express/Socket.IO. Deploy `backend/` separately (Render free), then tell the frontend its URL.

A `render.yaml` is already included at repo root for one‑click deploy.

### Deploy on Render (free, ~2 min)
1. Create account at https://render.com
2. **New → Web Service** → **Connect a repository** → select `Vijayaragavan05/BrainArena_Quiz_Game`
3. Render auto‑reads `render.yaml`:
   - Root directory: `backend`
   - Build: `npm install && npm run build`
   - Start: `npm start`
   - Plan: Free
4. In the Render dashboard, set these **env vars** (the YAML marks `sync: false` for secrets):
   - `MONGO_URI` = your MongoDB Atlas connection string (the same one in `backend/.env`)
   - `JWT_SECRET` = any long random string (e.g. `openssl rand -hex 32`)
   - `CORS_ORIGIN` = `https://vijayaragavan05.github.io`  (already defaulted in yaml)
   - `FRONTEND_URL` = `https://vijayaragavan05.github.io` (already defaulted)
   - `AI_PROVIDER` = `mock` (already defaulted; switch to `gemini`/`openai` + key if desired)
5. Click **Deploy**. Wait ~2 min. Copy the generated URL, e.g. `https://brainarena-api.onrender.com`

### Wire the frontend to the backend
In the GitHub repo → **Settings → Secrets and variables → Actions → Variables**, add:
- `VITE_API_URL` = `https://brainarena-api.onrender.com/api`  ← your Render URL + `/api`
- `VITE_SOCKET_URL` = `https://brainarena-api.onrender.com`     ← same URL, no `/api`

Then **rebuild the frontend** so these bake into the static site:
- Go to **Actions → Deploy Frontend to GitHub Pages → Run workflow** (it has `workflow_dispatch`), OR
- Push any commit (e.g. `git commit --allow-empty -m "rebuild with backend"` + `git push`).

After the green ✔, reload `https://vijayaragavan05.github.io/BrainArena_Quiz_Game/` — the **DEMO MODE** banner disappears and real login/quizzes/live sessions work.

> MongoDB Atlas must allow connections from anywhere (`0.0.0.0/0`) or from Render's IPs.  
> Render free tier spins down after inactivity; first request may take ~30s to wake.

For local dev, keep `frontend/.env` unset — it falls back to `/api` proxy to `localhost:5000`.

## 6) Local host link (dev)
`npm run dev` in `frontend/` → http://localhost:5173 (proxies to backend 5000)
`npm run dev` in `backend/` → http://localhost:5000

## Troubleshooting
- Refresh gives 404 on Pages → workflow already copies 404.html; if you changed routing, ensure `BrowserRouter basename` matches `vite base`
- API 502 after Pages deploy → `VITE_API_URL` not set or backend CORS not allowing Pages origin — set `CORS_ORIGIN` on backend
- White screen after deploy → check Actions logs → `frontend/dist` must contain `index.html` with `/BrainArena_Quiz_Game/assets/...`
