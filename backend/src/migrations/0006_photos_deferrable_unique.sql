-- Make gallery position uniqueness deferrable by replacing partial unique index
-- This supports safe in-place reorders (even when gallery is full)

-- Drop the existing partial unique index
DROP INDEX IF EXISTS uniq_photos_gallery_position_per_user;

-- Add a deferrable unique constraint on (user_id, position)
-- Note: avatar rows have position NULL; UNIQUE allows multiple NULLs, so this effectively applies to gallery rows (1..5)
ALTER TABLE photos
  ADD CONSTRAINT uq_photos_gallery_position_per_user
  UNIQUE (user_id, position)
  DEFERRABLE INITIALLY DEFERRED;