BEGIN;

-- The direct staff path must distinguish an exact retry from a reused key
-- carrying another student, section, guardian, date or actor.
ALTER TABLE dance_enrollments ADD COLUMN IF NOT EXISTS request_hash TEXT;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='dance_enrollments_request_hash_check') THEN
    ALTER TABLE dance_enrollments ADD CONSTRAINT dance_enrollments_request_hash_check
      CHECK (request_hash IS NULL OR length(request_hash)=64);
  END IF;
END $$;

COMMIT;
