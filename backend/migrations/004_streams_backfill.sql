-- +goose Up
ALTER TABLE flows ADD COLUMN tcp_stream INT NULL;
CREATE INDEX IF NOT EXISTS flows_tcp_stream_idx ON flows(pcap_id, tcp_stream);

UPDATE flows
SET client_ip = src_ip,
    client_port = src_port,
    server_ip = dst_ip,
    server_port = dst_port
WHERE (client_ip = '' OR client_ip IS NULL)
  AND (client_port = 0)
  AND (server_ip = '' OR server_ip IS NULL)
  AND (server_port = 0);

WITH ordered AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY pcap_id
               ORDER BY first_seen,
                        COALESCE(NULLIF(client_ip, ''), src_ip),
                        COALESCE(NULLIF(client_port, 0), src_port),
                        COALESCE(NULLIF(server_ip, ''), dst_ip),
                        COALESCE(NULLIF(server_port, 0), dst_port),
                        id
           ) - 1 AS stream_id
    FROM flows
    WHERE proto = 'TCP'
)
UPDATE flows f
SET tcp_stream = ordered.stream_id
FROM ordered
WHERE f.id = ordered.id;

-- +goose Down
DROP INDEX IF EXISTS flows_tcp_stream_idx;
ALTER TABLE flows DROP COLUMN IF EXISTS tcp_stream;
