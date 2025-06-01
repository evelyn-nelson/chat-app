ALTER TABLE messages
ADD COLUMN ciphertext BYTEA NOT NULL,
ADD COLUMN msg_nonce BYTEA NOT NULL,   
ADD COLUMN key_envelopes JSONB NOT NULL;

COMMENT ON COLUMN messages.ciphertext IS 'Encrypted message content (libsodium secretbox output)';
COMMENT ON COLUMN messages.msg_nonce IS 'Nonce used for symmetric encryption of the ciphertext';
COMMENT ON COLUMN messages.key_envelopes IS 'JSON array of per-recipient sealed symmetric keys. Each element: {deviceId, ephPubKey, keyNonce, sealedKey}';
ALTER TABLE messages
DROP COLUMN content;