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
Pages cannot run Node/Express/Socket.IO. Deploy `backend/` separately, then tell the frontend its URL:

Option A — Render (free):
1. https://render.com → New Web Service → connect same repo → Root Directory `backend`
2. Build: `npm install` , Start: `npm start` (or `npx tsx src/server.ts`)
3. Env vars: `MONGO_URI`, `JWT_SECRET`, `FRONTEND_URL=https://<USERNAME>.github.io`, `CORS_ORIGIN=https://<USERNAME>.github.io`
4. After deploy, copy its URL e.g. `https://brainarena-api.onrender.com`

Option B — Railway / Fly.io / Vercel similarly.

Then in GitHub repo → Settings → Secrets and variables → Actions → Variables → New variable:
- Name: `VITE_API_URL`
- Value: `https://brainarena-api.onrender.com/api` (your backend URL + /api)

Or set Secret `VITE_API_URL` same. Next push will bake it into the build (`frontend/src/services/api.ts:4`).

For local dev, keep `frontend/.env` unset — it falls back to `/api` proxy to `localhost:5000`.

## 6) Local host link (dev)
`npm run dev` in `frontend/` → http://localhost:5173 (proxies to backend 5000)
`npm run dev` in `backend/` → http://localhost:5000

## Troubleshooting
- Refresh gives 404 on Pages → workflow already copies 404.html; if you changed routing, ensure `BrowserRouter basename` matches `vite base`
- API 502 after Pages deploy → `VITE_API_URL` not set or backend CORS not allowing Pages origin — set `CORS_ORIGIN` on backend
- White screen after deploy → check Actions logs → `frontend/dist` must contain `index.html` with `/BrainArena_Quiz_Game/assets/...`
