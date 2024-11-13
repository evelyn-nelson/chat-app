CREATE TABLE "messages" (
    "id" SERIAL PRIMARY KEY,
    "content" varchar NOT NULL,
    "user_id" INTEGER REFERENCES users (id),
    "group_id" INTEGER REFERENCES groups (id),
    "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);