-- +goose Up
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE pcaps (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    uploaded_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE jobs (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pcap_id INT NOT NULL REFERENCES pcaps(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    progress DOUBLE PRECISION NOT NULL DEFAULT 0,
    started_at TIMESTAMP NULL,
    finished_at TIMESTAMP NULL,
    error TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX jobs_status_idx ON jobs(status);
CREATE INDEX jobs_pcap_idx ON jobs(pcap_id);

CREATE TABLE flows (
    id SERIAL PRIMARY KEY,
    pcap_id INT NOT NULL REFERENCES pcaps(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    proto TEXT NOT NULL,
    src_ip TEXT NOT NULL,
    dst_ip TEXT NOT NULL,
    src_port INT NOT NULL,
    dst_port INT NOT NULL,
    first_seen TIMESTAMP NOT NULL,
    last_seen TIMESTAMP NOT NULL,
    syn_time TIMESTAMP NULL,
    syn_ack_time TIMESTAMP NULL,
    ack_time TIMESTAMP NULL,
    rtt_ms DOUBLE PRECISION NULL,
    bytes_sent BIGINT NOT NULL DEFAULT 0,
    bytes_recv BIGINT NOT NULL DEFAULT 0,
    retransmits BIGINT NOT NULL DEFAULT 0,
    out_of_order BIGINT NOT NULL DEFAULT 0,
    mss INT NULL,
    tls_version TEXT NULL,
    tls_sni TEXT NULL,
    alpn TEXT NULL,
    rst_count BIGINT NOT NULL DEFAULT 0,
    fragment_count BIGINT NOT NULL DEFAULT 0,
    throughput_bps DOUBLE PRECISION NULL,
    http_method TEXT NULL,
    http_host TEXT NULL,
    http_time TIMESTAMP NULL
);
CREATE INDEX flows_pcap_idx ON flows(pcap_id);
CREATE INDEX flows_user_idx ON flows(user_id);
CREATE INDEX flows_tuple_idx ON flows(pcap_id, proto, src_ip, dst_ip, src_port, dst_port);

CREATE TABLE issues (
    id SERIAL PRIMARY KEY,
    pcap_id INT NOT NULL REFERENCES pcaps(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    flow_id INT NULL REFERENCES flows(id) ON DELETE SET NULL,
    severity TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    evidence_json JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX issues_pcap_idx ON issues(pcap_id);
CREATE INDEX issues_severity_idx ON issues(severity);

CREATE TABLE ai_explanations (
    id SERIAL PRIMARY KEY,
    issue_id INT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prompt_hash TEXT NOT NULL,
    model TEXT NOT NULL,
    response_text TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX ai_explanations_issue_idx ON ai_explanations(issue_id);
CREATE INDEX ai_explanations_hash_idx ON ai_explanations(prompt_hash);

CREATE TABLE pcap_stats (
    id SERIAL PRIMARY KEY,
    pcap_id INT NOT NULL UNIQUE REFERENCES pcaps(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    top_talkers_json JSONB NOT NULL,
    top_flows_json JSONB NOT NULL,
    rtt_histogram_json JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- +goose Down
DROP TABLE IF EXISTS pcap_stats;
DROP TABLE IF EXISTS ai_explanations;
DROP TABLE IF EXISTS issues;
DROP TABLE IF EXISTS flows;
DROP TABLE IF EXISTS jobs;
DROP TABLE IF EXISTS pcaps;
DROP TABLE IF EXISTS users;
