-- photos table for user images (avatar + up to 5 gallery photos)
CREATE TABLE IF NOT EXISTS photos (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('avatar','gallery')),
  position INTEGER,
  storage_key TEXT NOT NULL UNIQUE,
  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  size_bytes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- position constraints: avatar must have NULL position; gallery must be 1..5
ALTER TABLE photos
  ADD CONSTRAINT photos_position_avatar_null CHECK (kind <> 'avatar' OR position IS NULL);
ALTER TABLE photos
  ADD CONSTRAINT photos_position_gallery_range CHECK (kind <> 'gallery' OR (position BETWEEN 1 AND 5));

-- only one avatar per user
CREATE UNIQUE INDEX IF NOT EXISTS uniq_photos_avatar_per_user ON photos(user_id) WHERE kind = 'avatar';

-- gallery positions unique per user (1..5)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_photos_gallery_position_per_user ON photos(user_id, position) WHERE kind = 'gallery';

-- updated_at trigger (reuse set_updated_at)
DROP TRIGGER IF EXISTS trg_photos_updated_at ON photos;
CREATE TRIGGER trg_photos_updated_at
BEFORE UPDATE ON photos
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
