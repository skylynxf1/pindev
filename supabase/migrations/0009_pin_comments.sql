-- ── pin_comments ─────────────────────────────────────────────────────────────
-- Flat comment system for published pins.
-- No threading, no editing — immutable once posted.

CREATE TABLE pin_comments (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pin_id     UUID        NOT NULL REFERENCES pins(id)     ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body       TEXT        NOT NULL CHECK (char_length(body) BETWEEN 3 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast lookup: all comments for a pin ordered newest-first
CREATE INDEX idx_pin_comments_pin_created ON pin_comments (pin_id, created_at DESC);
-- Fast rate-limit check: all comments by a user within a time window
CREATE INDEX idx_pin_comments_user_id ON pin_comments (user_id);

-- Reuse the set_updated_at() function created in 0001_init.sql
CREATE TRIGGER set_pin_comments_updated_at
  BEFORE UPDATE ON pin_comments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE pin_comments ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous) can read comments on published pins
CREATE POLICY "comments_read_if_pin_published" ON pin_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pins
      WHERE pins.id = pin_comments.pin_id
        AND pins.is_published = true
    )
  );

-- Authenticated users can only insert comments as themselves.
-- auth.uid() = user_id prevents any client from impersonating another user.
CREATE POLICY "comments_insert_as_self" ON pin_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Authors can delete their own comments only.
CREATE POLICY "comments_delete_own" ON pin_comments
  FOR DELETE USING (auth.uid() = user_id);

-- No UPDATE policy — comments cannot be edited after posting.
