-- Goi — esquema inicial (Fase 7)
-- Equivalente pedagógico a NoteFlow (notes / checklist_items / note_tags),
-- adaptado al dominio Goi: usuarios, publicaciones y comentarios.
--
-- Aplicar: Neon Dashboard → SQL Editor → pegar y Run
-- O en local: npm run db:schema (requiere DATABASE_URL en .env.local)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- users — cuentas de la red social
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(32) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  goal TEXT NOT NULL DEFAULT '',
  avatar_url TEXT NOT NULL DEFAULT '',
  banner_url TEXT NOT NULL DEFAULT '',
  banner_show_in_feed BOOLEAN NOT NULL DEFAULT TRUE,
  website_url TEXT NOT NULL DEFAULT '',
  instagram_url TEXT NOT NULL DEFAULT '',
  strava_url TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  profile_visibility VARCHAR(20) NOT NULL DEFAULT 'public'
    CHECK (profile_visibility IN ('public', 'followers', 'private', 'request')),
  pinned_post_id UUID,
  discoverable BOOLEAN NOT NULL DEFAULT TRUE,
  notification_prefs JSONB NOT NULL DEFAULT '{"mutedTypes":[]}'::jsonb,
  password_reset_token_hash TEXT,
  password_reset_expires TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_username_unique UNIQUE (username),
  CONSTRAINT users_email_unique UNIQUE (email)
);

-- ---------------------------------------------------------------------------
-- posts — publicaciones del feed (≈ notes en NoteFlow)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  format VARCHAR(20) NOT NULL DEFAULT 'standard'
    CHECK (format IN ('standard', 'training')),
  visibility VARCHAR(20) NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'followers', 'private')),
  session_id UUID,
  /** Imágenes en data URL, mismo formato que store.json legacy. */
  media JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS posts_user_id_idx ON posts(user_id);
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON posts(created_at DESC);

-- ---------------------------------------------------------------------------
-- post_comments — comentarios en una publicación (≈ checklist_items / tags)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content VARCHAR(180) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS post_comments_post_id_idx ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS post_comments_user_id_idx ON post_comments(user_id);

-- ---------------------------------------------------------------------------
-- post_tags — etiquetas libres en una publicación (≈ note_tags en NoteFlow)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS post_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag VARCHAR(100) NOT NULL
);

CREATE INDEX IF NOT EXISTS post_tags_post_id_idx ON post_tags(post_id);

-- ---------------------------------------------------------------------------
-- post_likes — me gusta en publicaciones
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT post_likes_post_user_unique UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS post_likes_post_id_idx ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS post_likes_user_id_idx ON post_likes(user_id);

-- ---------------------------------------------------------------------------
-- follows — relaciones de seguimiento
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'pending')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT follows_pair_unique UNIQUE (follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS follows_follower_id_idx ON follows(follower_id);
CREATE INDEX IF NOT EXISTS follows_following_id_idx ON follows(following_id);

-- ---------------------------------------------------------------------------
-- notification_reads — campana del feed (clave estable p. ej. like:uuid)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_reads (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_key VARCHAR(120) NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, notification_key)
);

CREATE INDEX IF NOT EXISTS notification_reads_user_id_idx ON notification_reads(user_id);

-- ---------------------------------------------------------------------------
-- exercises — catálogo global
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  muscles JSONB NOT NULL DEFAULT '[]'::jsonb,
  equipment_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  equipment TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  instructions TEXT NOT NULL DEFAULT ''
);

-- ---------------------------------------------------------------------------
-- workouts — rutinas de usuario
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(80) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  exercise_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  exercise_blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS workouts_user_id_idx ON workouts(user_id);

-- ---------------------------------------------------------------------------
-- workout_sessions — sesiones realizadas
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  performed_at TIMESTAMPTZ NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS workout_sessions_user_id_idx ON workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS workout_sessions_performed_at_idx ON workout_sessions(performed_at DESC);

-- ---------------------------------------------------------------------------
-- story_reels — historias (24h, slides en JSONB)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS story_reels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slides JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS story_reels_user_id_idx ON story_reels(user_id);
CREATE INDEX IF NOT EXISTS story_reels_expires_at_idx ON story_reels(expires_at);

-- ---------------------------------------------------------------------------
-- user_blocks — bloqueos entre usuarios
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_blocks_pair_unique UNIQUE (blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS user_blocks_blocker_id_idx ON user_blocks(blocker_id);
