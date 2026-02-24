-- ============================================================
-- PinDev · 0006_ranking.sql
-- Adds engagement columns for scored feed ranking.
--
-- Score formula (computed server-side):
--   likeRate  = likes_count  / (impressions_count + 30)
--   clickRate = clicks_count / (impressions_count + 30)
--   quality   = 0.70 * likeRate + 0.30 * clickRate
--   decay     = exp(-ageHours / 96)
--   videoMult = has_video ? 1.12 : 1.0
--   explorationMult = 1 + clamp((500 - impressions_count)/500, 0, 1) * 0.15
--   score     = (quality * 100) * decay * videoMult * explorationMult
-- ============================================================

-- ── Engagement counters ───────────────────────────────────────────────────────
ALTER TABLE public.pins
  ADD COLUMN IF NOT EXISTS likes_count       INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicks_count      INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS impressions_count INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_video         BOOLEAN     NOT NULL DEFAULT false;

-- ── Admin override columns ────────────────────────────────────────────────────
-- admin_pinned_position: 1-indexed slot where the pin is injected into the feed.
-- admin_pinned_until: after this timestamp the override expires automatically.
ALTER TABLE public.pins
  ADD COLUMN IF NOT EXISTS admin_pinned_position INTEGER     DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS admin_pinned_until     TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS admin_pinned_at        TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS admin_pinned_by        UUID        DEFAULT NULL;

-- ── Backfill has_video from existing media_type data ─────────────────────────
UPDATE public.pins SET has_video = (media_type = 'video') WHERE true;

-- ── Indexes ───────────────────────────────────────────────────────────────────
-- idx_pins_created_at already exists from 0001_init.sql — skip.
CREATE INDEX IF NOT EXISTS idx_pins_impressions
  ON public.pins (impressions_count);

CREATE INDEX IF NOT EXISTS idx_pins_admin_pinned
  ON public.pins (admin_pinned_position ASC NULLS LAST)
  WHERE admin_pinned_position IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pins_admin_pinned_until
  ON public.pins (admin_pinned_until)
  WHERE admin_pinned_until IS NOT NULL;

-- ── Trigger: keep likes_count in sync with pin_likes table ───────────────────
-- Assumes pin_likes(pin_id, user_id) exists. Uses SECURITY DEFINER so the
-- function can write to pins even when called from a restricted role.
CREATE OR REPLACE FUNCTION public.sync_pin_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.pins SET likes_count = likes_count + 1 WHERE id = NEW.pin_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.pins SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.pin_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_pin_likes ON public.pin_likes;
CREATE TRIGGER trg_sync_pin_likes
  AFTER INSERT OR DELETE ON public.pin_likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_pin_likes_count();

-- ── Backfill likes_count from any pre-existing pin_likes rows ─────────────────
UPDATE public.pins p
SET likes_count = (
  SELECT COUNT(*) FROM public.pin_likes pl WHERE pl.pin_id = p.id
);
