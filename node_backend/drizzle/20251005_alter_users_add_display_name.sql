-- Ensure email is NOT NULL (will fail if null rows exist; clean them first if needed)
ALTER TABLE users
  ALTER COLUMN email SET NOT NULL;

-- Add display_name if missing; backfill with concatenation or username fallback
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'display_name'
  ) THEN
    ALTER TABLE users
      ADD COLUMN display_name VARCHAR(255);
    UPDATE users
      SET display_name = COALESCE(NULLIF(TRIM(CONCAT_WS(' ', first_name, last_name)), ''), username, 'User');
    ALTER TABLE users
      ALTER COLUMN display_name SET NOT NULL;
  END IF;
END $$;

-- Optional: create index if you will search by display_name
-- CREATE INDEX IF NOT EXISTS idx_users_display_name ON users(display_name);
