# NetSage — AI-Assisted Packet & Flow Intelligence

![CI](https://github.com/your-org/your-repo/actions/workflows/ci.yml/badge.svg)

NetSage is a Go + React system that analyzes PCAP files, reconstructs flows, surfaces network issues, and provides an AI-assisted explanation workflow. It is designed as a practical internal tool for SRE/security teams to spot latency, retransmission, TLS, and MTU problems without loading entire captures into memory.

## Why it matters
- **Fast triage**: pinpoints top talkers, suspicious flows, and latency hot spots.
- **Flow-aware diagnostics**: reconstructs TCP handshakes and estimates RTT, retransmissions, and out-of-order behavior.
- **Explainability**: AI “Explain this issue” uses sanitized metadata (no payloads).

## Architecture
```
              +--------------------+
              |  React Dashboard   |
              |  Vite + Tailwind   |
              +---------+----------+
                        |
                        v
+--------------+  REST API  +--------------------+    +------------------+
| Upload PCAP  |----------->| Go API (chi)       |--->| Postgres          |
| + Jobs UI    |            | Auth + JWT         |    | flows, issues     |
+--------------+            | AI explain cache   |    +------------------+
                        ^   +---------+----------+
                        |             |
                        |             v
                        |    +--------------------+
                        |    | Go Worker          |
                        |    | gopacket parsing   |
                        |    | rules engine       |
                        |    +--------------------+
```

## Quick start
```bash
docker-compose up --build
```
- Frontend: `http://localhost:5173`
- API: `http://localhost:8080`

## Deployment (Vercel + Render)
See `docs/DEPLOYMENT.md` for the full CI/CD flow.

Note: If Render storage is limited to a single disk, run API + worker in one service using `/app/run_all.sh` as the start command.

## Upload and analyze
1. Create an account.
2. Upload a `.pcap` file on the **Upload & Jobs** page.
3. Wait for the job to complete.
4. Explore the PCAP detail dashboard, flows, and issues.

## Auth storage note
- The frontend stores JWTs in `localStorage` for simplicity.
- For higher security, move to httpOnly cookies + CSRF protection.

## AI safety notes
- The AI endpoint receives **sanitized structured metadata** (issue summaries, RTT/retrans counts, TLS version). No raw payload bytes are sent.
- Disable AI calls by setting `NETSAGE_AI_ENABLED=false`.
- The AI response is cached in-memory (LRU + TTL) and stored per-user in Postgres.

## Sample PCAP
Generate a tiny sample capture:
```bash
cd backend
go run ./tools/pcapgen
```
This creates `backend/testdata/sample.pcap`.

## Tests
```bash
cd backend
# unit tests
go test ./...

# integration (requires a Postgres instance)
NETSAGE_TEST_DATABASE_URL=postgres://netsage:netsage@localhost:5432/netsage?sslmode=disable \
  go test -tags=integration ./internal/integration
```

## API docs
See `docs/openapi.yaml` for routes and schemas.

## Screenshots
- `docs/screenshots/dashboard.png`
- `docs/screenshots/flow-detail.png`
- `docs/screenshots/issues.png`

## Future improvements
- Live capture ingestion
- HTTP parsing depth and TLS JA3/JA4 fingerprints
- Flow-based anomaly scoring
- Object storage for large PCAP uploads
- Multi-node worker scaling
