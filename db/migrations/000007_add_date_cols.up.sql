BEGIN;
ALTER TABLE groups
    ADD COLUMN "start_time" TIMESTAMP,
    ADD COLUMN "end_time" TIMESTAMP;
UPDATE groups SET start_time = '2025-03-30 00:00:00', end_time = '2025-03-31 00:00:00';
ALTER TABLE groups
    ALTER COLUMN "start_time" SET NOT NULL,
    ALTER COLUMN "end_time" SET NOT NULL;
COMMIT;