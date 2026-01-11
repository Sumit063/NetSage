# NetSage Capabilities

NetSage is an AI-assisted packet and flow intelligence tool focused on fast, safe diagnosis of network behavior from PCAPs.

## Supported capture formats
- .pcap (libpcap)
- .pcapng (pcapng)
- IPv4/IPv6 over TCP/UDP is expected. Non-IP or uncommon link types may be ignored.

## What a network engineer can do in the UI
- Upload a capture and see a flow list ("streams") grouped by 5-tuple.
- Open a flow to view handshake timing, RTT, retransmissions, out-of-order signals, and MSS/fragmentation hints.
- See TLS metadata (SNI, ALPN, version) when present in the capture.
- Run cert inspection to fetch the live certificate chain for a flow host.
- Review issues and ask AI to explain a finding using only sanitized metadata.

## Core workflows
1. Register/login and upload a PCAP.
2. The upload creates a background analysis job.
3. The worker streams the PCAP, reconstructs flows, and emits issues.
4. The dashboard shows flows, issues, and charts; optional AI explanations are available.

## Flow reconstruction and metrics
- 5-tuple flow keying: src/dst IP, ports, and protocol for TCP/UDP flows.
- TCP handshake timing: SYN -> SYN/ACK -> ACK timing and RTT estimates.
- Retransmission detection: bounded LRU on sequence ranges to detect repeats.
- Out-of-order estimation: gap detection on sequence progression.
- Throughput estimates: bytes per window over time.
- Latency distribution: histogram buckets for p50/p95/p99 approximations.
- Top-K: heap-based top talkers and top flows by volume.

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

### What the "Explain with AI" button does
When you click **Explain with AI** on an issue:
1. The API builds a sanitized summary (no payload bytes) with:
   - Issue: id, severity, type, title, description, evidence JSON.
   - Flow metadata: proto, src/dst IP+port, RTT, retransmits, out-of-order, MSS,
     TLS version/SNI/ALPN, TLS client/server hello flags, TLS alert flag, RST count,
     fragment count, throughput.
2. The backend sends a prompt to the configured OpenAI-compatible endpoint.
3. The model responds with:
   - A short diagnosis summary
   - Likely causes
   - Recommended next steps
   - Confidence level
4. The UI shows the AI response plus the exact "Data Shared" JSON for transparency.

## Certificate inspection (optional)
- Active check to fetch TLS certificate chains for a flow host.
- Detects expired certs, hostname mismatch (best-effort), incomplete chain, self-signed, and weak signature algorithms.

## Data storage and access control
- PostgreSQL stores users, PCAPs, jobs, flows, issues, and AI explanations.
- JWT + bcrypt for authentication.
- Per-user data isolation: users only see their own captures and analyses.

## Limitations to be aware of
- No full TCP stream reassembly or payload storage by default.
- No TLS decryption or full HTTP body extraction.
- Limited application protocol parsing beyond TLS and basic HTTP headers.
- Mixed link types in pcapng may be partially ignored.

## How it works (high level)
1. API receives upload and persists PCAP metadata and file path.
2. A job is queued in Postgres; the worker locks and processes it.
3. The worker streams packets via gopacket, aggregates into flows, and emits issues.
4. Aggregations and issues are stored for UI queries and dashboards.
