CREATE TABLE IF NOT EXISTS device_keys (
  user_id     UUID        NOT NULL REFERENCES users(id),
  device_id   UUID        NOT NULL DEFAULT gen_random_uuid(),
  public_key  TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen   TIMESTAMPTZ,
  device_name TEXT,
  revoked_at  TIMESTAMPTZ,
  info        JSONB,
  PRIMARY KEY (user_id, device_id)
);

CREATE INDEX ON device_keys(user_id);