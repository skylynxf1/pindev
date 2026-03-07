-- ── Comment replies & likes ──────────────────────────────────────────────────
-- Adds threaded replies (1-level deep) and per-comment likes.

-- 1. Add parent_comment_id for replies (nullable = top-level comment)
ALTER TABLE pin_comments
  ADD COLUMN parent_comment_id UUID REFERENCES pin_comments(id) ON DELETE CASCADE;

-- Index for fetching replies grouped under their parent
CREATE INDEX idx_pin_comments_parent ON pin_comments (parent_comment_id, created_at ASC);

-- 2. Comment likes table
CREATE TABLE comment_likes (
  comment_id UUID NOT NULL REFERENCES pin_comments(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id)     ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);

-- Fast lookup: all likes by a user (for checking "did I like this?")
CREATE INDEX idx_comment_likes_user ON comment_likes (user_id);

-- ── RLS for comment_likes ───────────────────────────────────────────────────

ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- Anyone can read likes (needed for counts)
CREATE POLICY "comment_likes_read" ON comment_likes
  FOR SELECT USING (true);

-- Authenticated users can only insert likes as themselves
CREATE POLICY "comment_likes_insert_as_self" ON comment_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own likes
CREATE POLICY "comment_likes_delete_own" ON comment_likes
  FOR DELETE USING (auth.uid() = user_id);
