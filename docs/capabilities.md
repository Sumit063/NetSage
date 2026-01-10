# NetSage Capabilities

NetSage is an AI-assisted packet and flow intelligence tool focused on fast, safe diagnosis of network behavior from PCAPs.

## What it helps with
- Identify latency drivers (RTT spikes, long handshakes, delayed ACKs).
- Detect retransmissions, out-of-order delivery, and suspected MTU/PMTUD problems.
- Surface TLS handshake issues, missing/expired certs, and weak configuration hints.
- Summarize top talkers, heavy flows, and issue trends for triage.
- Provide consistent explanations (AI) from sanitized metadata only.

## Core workflows
1. Register/login and upload a PCAP.
2. The upload creates a background analysis job.
3. The worker streams the PCAP, reconstructs flows, and emits issues.
4. The dashboard shows flows, issues, and charts; optional AI explanations are available.

## Flow reconstruction and metrics
- **5-tuple flow keying**: src/dst IP, ports, and protocol for TCP/UDP flows.
- **TCP handshake timing**: SYN -> SYN/ACK -> ACK timing and RTT estimates.
- **Retransmission detection**: bounded LRU on sequence ranges to detect repeats.
- **Out-of-order estimation**: gap detection on sequence progression.
- **Throughput estimates**: bytes per window over time.
- **Latency distribution**: histogram buckets for p50/p95/p99 approximations.
- **Top-K**: heap-based top talkers and top flows by volume.

## TLS and HTTP diagnostics
- TLS ClientHello/ServerHello parsing (when present in the capture).
- Extracts TLS version, SNI, and ALPN.
- Detects handshake failures (alerts, abrupt FIN/RST after ClientHello).
- Minimal HTTP request parsing for method and host hints.

## MTU/MSS and fragmentation hints
- Extracts TCP MSS from SYN options.
- Detects IP fragmentation flags/offsets.
- Heuristic PMTUD blackhole signals (retransmissions around a payload size).

## Issues engine
- Rules-based issue emission with HIGH/MED/LOW severities.
- Evidence JSON stored per issue for transparency and AI prompt context.
- Idempotent processing avoids duplicates on re-runs.

## AI explanation (optional)
- "Explain" button requests a concise explanation from an OpenAI-compatible API.
- Only structured metadata is sent (no raw payloads).
- LRU caching avoids repeated calls for identical issue summaries.
- Config flag disables AI calls for offline mode.

## Certificate inspection (optional)
- Active check to fetch TLS certificate chains for a flow's SNI/host.
- Detects expired certs, hostname mismatch (best-effort), incomplete chain, self-signed, and weak signature algorithms.

## Data storage and access control
- PostgreSQL stores users, PCAPs, jobs, flows, issues, and AI explanations.
- JWT + bcrypt for authentication.
- Per-user data isolation: users only see their own captures and analyses.

## How it works (high level)
1. API receives upload and persists PCAP metadata and file path.
2. A job is queued in Postgres; the worker locks and processes it.
3. The worker streams packets via gopacket, aggregates into flows, and emits issues.
4. Aggregations and issues are stored for UI queries and dashboards.
