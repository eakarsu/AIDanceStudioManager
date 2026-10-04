-- Earlier deployments stored bcrypt hashes in users.password and split names
-- across first_name/last_name. Keep those accounts while adopting the current
-- users schema expected by authentication and administrator provisioning.
DO $$
DECLARE
  has_password BOOLEAN;
  has_password_hash BOOLEAN;
  invalid_hashes BIGINT;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'users' AND column_name = 'password'
  ) INTO has_password;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'users' AND column_name = 'password_hash'
  ) INTO has_password_hash;

  IF has_password AND NOT has_password_hash THEN
    EXECUTE 'SELECT count(*) FROM users WHERE password IS NULL OR password NOT LIKE ''$2%'''
      INTO invalid_hashes;
    IF invalid_hashes > 0 THEN
      RAISE EXCEPTION 'Cannot migrate users.password: % values are not bcrypt hashes', invalid_hashes;
    END IF;
    ALTER TABLE users RENAME COLUMN password TO password_hash;
  ELSIF has_password AND has_password_hash THEN
    UPDATE users SET password_hash = password
    WHERE password_hash IS NULL AND password LIKE '$2%';
    ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
  ELSIF NOT has_password_hash THEN
    RAISE EXCEPTION 'users table has neither password_hash nor legacy password column';
  END IF;

  SELECT count(*) INTO invalid_hashes FROM users WHERE password_hash IS NULL;
  IF invalid_hashes > 0 THEN
    RAISE EXCEPTION 'Cannot migrate users: % accounts have no password hash', invalid_hashes;
  END IF;
END $$;

ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'users' AND column_name = 'first_name'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'users' AND column_name = 'last_name'
  ) THEN
    UPDATE users
    SET name = NULLIF(btrim(concat_ws(' ', first_name, last_name)), '')
    WHERE name IS NULL;
  END IF;
END $$;

UPDATE users SET is_active = TRUE WHERE is_active IS NULL;
ALTER TABLE users ALTER COLUMN is_active SET DEFAULT TRUE;
ALTER TABLE users ALTER COLUMN is_active SET NOT NULL;
