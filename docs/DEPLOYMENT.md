# Deployment Guide (Vercel + Render)

This guide sets up NetSage with:
- Frontend on Vercel (React/Vite)
- Backend on Render (Docker web + worker + migrate job)

## Prerequisites
- A GitHub repo with this monorepo
- Render account and a PostgreSQL database
- Vercel account connected to GitHub

---

## 1) Render (backend)

### Create the database
1. In Render, create a PostgreSQL database.
2. Copy the **Internal Database URL** (use this for `NETSAGE_DATABASE_URL`).

### Deploy from blueprint
1. In Render, choose **New > Blueprint**.
2. Select your GitHub repo and use `render.yaml`.
3. When prompted, set the required environment variables:
   - `NETSAGE_DATABASE_URL`
   - `NETSAGE_JWT_SECRET`
   - `NETSAGE_CORS_ALLOWED_ORIGINS` (your Vercel domain)
   - Optional AI vars: `NETSAGE_AI_BASE_URL`, `NETSAGE_AI_API_KEY`, `NETSAGE_AI_MODEL`

### Migration job
- The blueprint defines a `netsage-migrate` job.
- Run it once after the database is provisioned (Render UI > Jobs).

### Storage for PCAPs
- The blueprint mounts `/data` on both API and worker.
- `NETSAGE_UPLOAD_DIR` is set to `/data/uploads`.

---

## 2) Vercel (frontend)
1. In Vercel, import the GitHub repo.
2. Set **Root Directory** to `frontend`.
3. Set environment variable:
   - `VITE_API_BASE_URL=https://<your-render-api>.onrender.com`
4. Deploy.

For previews, Vercel will automatically create preview URLs for pull requests.

---

## 3) Verify
1. Open the Vercel URL and register a user.
2. Upload a PCAP and confirm the job completes.
3. Check Render logs for API/worker health.
