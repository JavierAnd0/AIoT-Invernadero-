-- ============================================================
-- OAuth2 Migration — ejecutar UNA VEZ sobre la BD existente
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS auth_provider  VARCHAR(20)  NOT NULL DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS google_id      VARCHAR(100) UNIQUE,
  ADD COLUMN IF NOT EXISTS avatar_url     VARCHAR(500);

-- password_hash pasa a nullable (usuarios OAuth no tienen contraseña local)
ALTER TABLE users
  ALTER COLUMN password_hash DROP NOT NULL;

COMMENT ON COLUMN users.auth_provider IS 'Values: local | google';
COMMENT ON COLUMN users.google_id     IS 'Google sub claim — unique per Google account';
COMMENT ON COLUMN users.avatar_url    IS 'Profile picture URL from Google';

-- Verificar resultado
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;
