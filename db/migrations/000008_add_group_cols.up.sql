BEGIN;
ALTER TABLE groups
    ADD COLUMN "description" VARCHAR,
    ADD COLUMN "location" VARCHAR,
    ADD COLUMN "image_url" VARCHAR;
COMMIT;