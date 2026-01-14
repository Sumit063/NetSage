# NetSage Roadmap (Draft)

This roadmap focuses on making NetSage a faster, more guided triage tool than Wireshark for common incident workflows.

## Goals
- Reduce time-to-answer for latency, retransmission, TLS, and MTU issues.
- Provide guided explanations and prioritized actions, not just raw packets.
- Keep analysis safe by default (no payload storage).
- Make real-time and regression triage first-class workflows.

## Phase 2

### Near term
- Guided triage playbooks for common issues (latency, retrans, TLS alerts, PMTUD).
- Better cross-flow correlation (same server, same ASN, same SNI).
- Saved filters and "triage views" per team.
- Improved issue evidence display and one-click copy for ticketing.
- Explainable root cause suggestions with structured output and linked evidence.

### Mid term
- Flow-based anomaly scoring (baseline + deviation scoring).
- Regression comparison (baseline vs degraded captures with diffed metrics).
- HTTP/TLS layer analysis (HTTP timing/status, TLS fingerprints like JA3/JA4).
- Timeline view with flow spikes and issue clusters.
- Stream-to-issue linking (show exact segment ranges that triggered a rule).

## Phase 3

### Long term
- Live capture / TAP ingestion with sliding window analysis and real-time triage.
- Multi-node worker scaling and object storage for large captures.
- Protocol extensions (DNS, QUIC, gRPC hints) and richer HTTP analysis.

## Differentiation vs Wireshark (triage-first)
- Prioritized issue list with severities and evidence.
- High-level flow summary over packet-by-packet inspection.
- Repeatable workflows (playbooks) rather than manual packet hunting.
- Safe AI explanation based on metadata, not payloads.

## Explainable root cause suggestions (draft spec)

### What it is
Return structured, actionable guidance for an issue instead of only free-form text.

### Output shape
- Problem type, probable cause, and confidence score.
- Linked flows and metrics that support the diagnosis.
- Recommended next steps (tests to run, mitigations, data to collect).

### Safeguards
- Include evidence references for each claim.
- Fall back to rule-based templates if AI is disabled.

## Flow-based anomaly scoring (draft spec)

### What it is
Score each flow by how unusual it is compared to a baseline for similar flows, then surface the top anomalies with clear evidence.

### Why it helps
Wireshark is excellent for deep packet inspection but weak at ranking "what is weird" across thousands of flows. Anomaly scoring makes triage faster by ranking the few flows most likely to matter.

### Inputs (per flow)
- RTT percentiles, retransmits, out-of-order, loss hints.
- Handshake timings (SYN/SYN-ACK/ACK, TLS ClientHello/ServerHello).
- Throughput, bytes, duration, and connection resets.
- MSS/MTU hints and fragmentation signals.
- ICMP errors and TCP RST/FIN rates (when present).
- TLS metadata (SNI, version, ALPN, JA3/JA4) and HTTP host/method (when present).

### Baselines
- Per environment (prod vs staging), per service (SNI/host), per time window.
- Rolling baselines (last N captures) with decay to adapt to new normals.

### Scoring approaches
- Simple z-score or percentile-based deviation for each metric.
- Weighted composite score tuned by severity (latency > minor reorder).
- Optional rule overrides for "known bad" signals (TLS alerts, RST storms).

### Output
- Ranked list of anomalous flows with a short reason string (e.g., "RTT p95 is 4x baseline, 12% retransmit").
- Confidence indicator (high/med/low) based on baseline quality and sample size.
- Links back to the underlying flow detail and issue evidence.

### Safeguards
- Require minimum samples for baseline validity.
- Cap scores for single noisy metrics unless corroborated by other signals.
- Allow per-team overrides and suppressions.
