-- profiles table for user profile data
CREATE TABLE IF NOT EXISTS profiles (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  gender TEXT CHECK (gender IN ('male','female','other')),
  sexual_pref TEXT CHECK (sexual_pref IN ('straight','gay','bisexual','other')),
  bio TEXT NOT NULL DEFAULT '',
  birthdate DATE,
  fame_rating REAL NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- trigger to update updated_at (reuses existing set_updated_at())
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
