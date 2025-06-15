CREATE TYPE message_type AS ENUM ('text', 'image', 'control');
ALTER TABLE messages
ADD COLUMN message_type message_type NOT NULL DEFAULT 'text';