# Triage Rules (Phase 1)

NetSage loads deterministic triage rules from `backend/internal/triage/rules/*.yaml` at startup. Each rule defines:

- `issue_type`: LATENCY, RETRANSMISSION, or TLS_HANDSHAKE_FAILURE
- `severity`: 1–5 (higher is more severe)
- `title`: short display string
- `summary`: deterministic template that renders with flow metrics
- `conditions`: boolean logic on computed metrics

## Rule schema
```yaml
id: latency
issue_type: LATENCY
title: High flow latency
summary: "Latency exceeds thresholds (duration {{printf \"%.0f\" .duration_ms}} ms)."
conditions:
  any:
    - metric: duration_ms
      op: gt
      value: 2000
    - metric: handshake_rtt_ms_estimate
      op: gt
      value: 500
severity:
  base: 3
  steps:
    - severity: 4
      when:
        metric: duration_ms
        op: gte
        value: 2000
```

## Supported operators
- `gt`, `gte`, `lt`, `lte`, `eq`, `neq`

## Available metrics (Phase 1)
- `duration_ms`, `handshake_rtt_ms_estimate`
- `tcp_retransmissions`, `tcp_syn_retransmissions`, `dup_acks`, `out_of_order`
- `tls_client_hello_seen`, `tls_server_hello_seen`, `tls_alert_seen`, `tls_alert_code`
- `packet_count`, `app_bytes`
- `client_ip`, `client_port`, `server_ip`, `server_port`, `protocol`

## Evidence
Each matched rule emits an issue plus evidence rows:
- `flow_id` for each implicated flow
- `packet_start_index`, `packet_end_index`
- `metrics_json` snapshot used for the decision
