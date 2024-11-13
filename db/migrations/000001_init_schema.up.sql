CREATE TABLE "users" (
  "id" SERIAL PRIMARY KEY,
  "username" varchar(255) NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "groups" (
    "id" SERIAL PRIMARY KEY,
    "name" varchar NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "user_groups" (
    "id" SERIAL PRIMARY KEY,
    "user_id" INTEGER REFERENCES users (id),
    "group_id" INTEGER REFERENCES groups (id),
    "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT NOW() 
);