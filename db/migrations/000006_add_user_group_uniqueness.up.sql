ALTER TABLE user_groups ADD CONSTRAINT unique_user_group UNIQUE (user_id, group_id);