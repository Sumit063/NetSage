# Deployment Guide (Vercel + Render, no Blueprint)

This guide deploys:
- Frontend on Vercel (React/Vite)
- Backend on Render (Docker web service + background worker)

## Prerequisites
- GitHub repo pushed
- Render account + PostgreSQL database
- Vercel account connected to GitHub

---

## 1) Render (backend, single service for shared storage)

### Create the database
1. In Render, create a **PostgreSQL** database.
2. Copy the **External Database URL** (or Internal if API/worker are in the same region).

### Create the API web service (API + worker in one container)
1. Render → **New > Web Service**.
2. Connect your GitHub repo.
3. **Environment**: Docker.
4. **Root Directory**: `backend`
5. **Dockerfile Path**: `backend/Dockerfile`
6. **Start Command**: `/app/run_all.sh`
7. **Health Check Path**: `/health`
8. Add environment variables:
   - `NETSAGE_DATABASE_URL` (from Render Postgres)
   - `NETSAGE_JWT_SECRET`
   - `NETSAGE_UPLOAD_DIR=/data/uploads`
   - `NETSAGE_MAX_UPLOAD_MB=100`
   - `NETSAGE_CORS_ALLOWED_ORIGINS=https://<your-vercel-domain>.vercel.app`
   - Optional AI:
     - `NETSAGE_AI_ENABLED=true`
     - `NETSAGE_AI_BASE_URL=https://api.openai.com/v1`
     - `NETSAGE_AI_API_KEY=...`
     - `NETSAGE_AI_MODEL=gpt-4o-mini`
9. Add a **disk** and mount it to `/data` (for PCAP uploads).

Notes:
- This runs the worker in the background inside the same container as the API, so both share the same disk.
- For scale, split API and worker into separate services and move PCAP storage to object storage (S3/R2/Spaces).

### Run migrations
Run the migration binary manually after deploy:
- Render UI → your API service → **Shell**:
  - `/app/migrate up`

---

## 2) Vercel (frontend)
1. Import the GitHub repo in Vercel.
2. Set **Root Directory** to `frontend`.
3. Set environment variable:
   - `VITE_API_BASE_URL=https://<your-render-api>.onrender.com`
4. Deploy.

Vercel automatically creates preview URLs for pull requests.

---

## 3) Verify
1. Open the Vercel URL and register a user.
2. Upload a PCAP and confirm the job completes.
3. Check Render logs for API/worker health.
