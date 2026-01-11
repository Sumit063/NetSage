-- +goose Up
ALTER TABLE flows
    ADD COLUMN tls_client_hello BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN tls_server_hello BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN tls_alert BOOLEAN NOT NULL DEFAULT FALSE;

-- +goose Down
ALTER TABLE flows
    DROP COLUMN IF EXISTS tls_client_hello,
    DROP COLUMN IF EXISTS tls_server_hello,
    DROP COLUMN IF EXISTS tls_alert;
