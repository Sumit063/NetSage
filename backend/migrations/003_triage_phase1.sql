-- +goose Up
ALTER TABLE flows ADD COLUMN client_ip TEXT NOT NULL DEFAULT '';
ALTER TABLE flows ADD COLUMN client_port INT NOT NULL DEFAULT 0;
ALTER TABLE flows ADD COLUMN server_ip TEXT NOT NULL DEFAULT '';
ALTER TABLE flows ADD COLUMN server_port INT NOT NULL DEFAULT 0;
ALTER TABLE flows ADD COLUMN packet_count BIGINT NOT NULL DEFAULT 0;
ALTER TABLE flows ADD COLUMN bytes_client_to_server BIGINT NOT NULL DEFAULT 0;
ALTER TABLE flows ADD COLUMN bytes_server_to_client BIGINT NOT NULL DEFAULT 0;
ALTER TABLE flows ADD COLUMN tcp_syn_retransmissions BIGINT NOT NULL DEFAULT 0;
ALTER TABLE flows ADD COLUMN dup_acks BIGINT NOT NULL DEFAULT 0;
ALTER TABLE flows ADD COLUMN first_payload_ts TIMESTAMP NULL;
ALTER TABLE flows ADD COLUMN last_payload_ts TIMESTAMP NULL;
ALTER TABLE flows ADD COLUMN duration_ms DOUBLE PRECISION NULL;
ALTER TABLE flows ADD COLUMN app_bytes BIGINT NOT NULL DEFAULT 0;
ALTER TABLE flows ADD COLUMN tls_alert_code INT NULL;

ALTER TABLE issues ADD COLUMN job_id INT NULL REFERENCES jobs(id) ON DELETE CASCADE;
ALTER TABLE issues RENAME COLUMN type TO issue_type;
ALTER TABLE issues RENAME COLUMN description TO summary;
ALTER TABLE issues RENAME COLUMN flow_id TO primary_flow_id;
ALTER TABLE issues ALTER COLUMN severity TYPE INT USING CASE
    WHEN severity ~ '^[0-9]+$' THEN severity::int
    WHEN severity = 'HIGH' THEN 5
    WHEN severity = 'MED' THEN 3
    WHEN severity = 'LOW' THEN 1
    ELSE 3
END;
ALTER TABLE issues DROP COLUMN evidence_json;
CREATE INDEX IF NOT EXISTS issues_job_idx ON issues(job_id);

CREATE TABLE issue_evidence (
    id SERIAL PRIMARY KEY,
    issue_id INT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    flow_id INT NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
    packet_start_index INT NOT NULL,
    packet_end_index INT NOT NULL,
    metrics_json JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX issue_evidence_issue_idx ON issue_evidence(issue_id);
CREATE INDEX issue_evidence_flow_idx ON issue_evidence(flow_id);

-- +goose Down
DROP TABLE IF EXISTS issue_evidence;

DROP INDEX IF EXISTS issues_job_idx;
ALTER TABLE issues ADD COLUMN evidence_json JSONB NOT NULL DEFAULT '{}';
ALTER TABLE issues ALTER COLUMN severity TYPE TEXT USING severity::text;
ALTER TABLE issues RENAME COLUMN issue_type TO type;
ALTER TABLE issues RENAME COLUMN summary TO description;
ALTER TABLE issues RENAME COLUMN primary_flow_id TO flow_id;
ALTER TABLE issues DROP COLUMN job_id;

ALTER TABLE flows DROP COLUMN IF EXISTS tls_alert_code;
ALTER TABLE flows DROP COLUMN IF EXISTS app_bytes;
ALTER TABLE flows DROP COLUMN IF EXISTS duration_ms;
ALTER TABLE flows DROP COLUMN IF EXISTS last_payload_ts;
ALTER TABLE flows DROP COLUMN IF EXISTS first_payload_ts;
ALTER TABLE flows DROP COLUMN IF EXISTS dup_acks;
ALTER TABLE flows DROP COLUMN IF EXISTS tcp_syn_retransmissions;
ALTER TABLE flows DROP COLUMN IF EXISTS bytes_server_to_client;
ALTER TABLE flows DROP COLUMN IF EXISTS bytes_client_to_server;
ALTER TABLE flows DROP COLUMN IF EXISTS packet_count;
ALTER TABLE flows DROP COLUMN IF EXISTS server_port;
ALTER TABLE flows DROP COLUMN IF EXISTS server_ip;
ALTER TABLE flows DROP COLUMN IF EXISTS client_port;
ALTER TABLE flows DROP COLUMN IF EXISTS client_ip;
