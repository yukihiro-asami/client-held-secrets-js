BEGIN;
CREATE SCHEMA IF NOT EXISTS roster;
CREATE TABLE IF NOT EXISTS roster.secret_use_records_pii (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  app_id text NOT NULL,
  user_id_pii text NOT NULL,
  operation_id uuid NOT NULL,
  request_hash bytea NOT NULL CHECK (octet_length(request_hash) = 64),
  receipt_payload bytea NOT NULL,
  signature bytea NOT NULL CHECK (octet_length(signature) = 64),
  signing_key_id text NOT NULL,
  UNIQUE (app_id, user_id_pii, operation_id)
);
COMMIT;
