CREATE TABLE "messages" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "content" varchar NOT NULL,
    "user_id" UUID REFERENCES users (id),
    "group_id" UUID REFERENCES groups (id),
    "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);