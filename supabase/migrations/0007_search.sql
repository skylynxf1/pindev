-- ============================================================
-- PinDev · 0007_search.sql
-- Adds pg_trgm fuzzy search, full-text search (tsvector),
-- and a hybrid ranked search RPC function.
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── tsvector column ─────────────────────────────────────────────────────────
-- Stores pre-computed full-text vector for title (weight A) and description
-- (weight B). Updated automatically via trigger on INSERT/UPDATE.

ALTER TABLE public.pins
  ADD COLUMN IF NOT EXISTS fts tsvector
    GENERATED ALWAYS AS (
      setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(description, '')), 'B')
    ) STORED;

-- ── Indexes ─────────────────────────────────────────────────────────────────

-- GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_pins_fts ON public.pins USING gin(fts);

-- GIN trigram indexes for fuzzy / typo-tolerant matching
CREATE INDEX IF NOT EXISTS idx_pins_title_trgm
  ON public.pins USING gin(title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_pins_description_trgm
  ON public.pins USING gin(description gin_trgm_ops);

-- ── Hybrid search RPC ───────────────────────────────────────────────────────
-- Combines:
--   1. pg_trgm similarity (typo tolerance)
--   2. Full-text ts_rank_cd (BM25-ish relevance)
--   3. Exact tag/category boost
--   4. Popularity boost (likes, capped)
--   5. Recency boost
--
-- Parameters:
--   search_query   - the user's raw search string (already expanded/normalized by caller)
--   tag_filter     - optional tag name to restrict results
--   result_limit   - max results to return
--   result_offset  - pagination offset
--
-- Returns rows with all pin fields + score, ordered by score DESC.

CREATE OR REPLACE FUNCTION public.search_pins_ranked(
  search_query   text,
  tag_filter     text    DEFAULT '',
  result_limit   integer DEFAULT 20,
  result_offset  integer DEFAULT 0
)
RETURNS TABLE (
  id                    uuid,
  owner_id              uuid,
  title                 text,
  description           text,
  live_url              text,
  repo_url              text,
  media_url             text,
  media_type            text,
  thumbnail_url         text,
  is_published          boolean,
  created_at            timestamptz,
  updated_at            timestamptz,
  likes_count           integer,
  clicks_count          integer,
  impressions_count     integer,
  has_video             boolean,
  admin_pinned_position integer,
  admin_pinned_until    timestamptz,
  rank_score            real
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tsq        tsquery;
  query_norm text;
  tokens     text[];
BEGIN
  query_norm := lower(trim(search_query));

  -- Tokenize the query
  tokens := string_to_array(regexp_replace(query_norm, '\s+', ' ', 'g'), ' ');
  tokens := array(SELECT unnest(tokens) WHERE length(unnest) > 0);

  -- Build tsquery: try websearch_to_tsquery first (handles multi-word nicely),
  -- fall back to plainto_tsquery if it errors
  BEGIN
    tsq := websearch_to_tsquery('english', search_query);
  EXCEPTION WHEN OTHERS THEN
    tsq := plainto_tsquery('english', search_query);
  END;

  RETURN QUERY
  SELECT
    p.id,
    p.owner_id,
    p.title,
    p.description,
    p.live_url,
    p.repo_url,
    p.media_url,
    p.media_type,
    p.thumbnail_url,
    p.is_published,
    p.created_at,
    p.updated_at,
    p.likes_count,
    p.clicks_count,
    p.impressions_count,
    p.has_video,
    p.admin_pinned_position,
    p.admin_pinned_until,
    (
      -- ── Signal 1: Trigram similarity on title (0-1, weight 0.35) ──────
      COALESCE(similarity(p.title, query_norm), 0) * 0.35

      -- ── Signal 2: Trigram similarity on description (0-1, weight 0.10) ─
      + COALESCE(similarity(p.description, query_norm), 0) * 0.10

      -- ── Signal 3: Full-text rank (0-1 range, weight 0.30) ────────────
      + CASE
          WHEN tsq IS NOT NULL AND p.fts @@ tsq
          THEN LEAST(ts_rank_cd(p.fts, tsq, 32), 1.0) * 0.30
          ELSE 0
        END

      -- ── Signal 4: Tag exact match boost (+0.15 per matching tag token) ─
      + COALESCE((
          SELECT SUM(0.15)
          FROM public.pin_tags pt
          JOIN public.tags t ON t.id = pt.tag_id
          WHERE pt.pin_id = p.id
            AND t.name = ANY(tokens)
        ), 0)

      -- ── Signal 5: Popularity boost (log-scaled, capped at 0.05) ──────
      + LEAST(ln(GREATEST(p.likes_count, 0) + 1) * 0.01, 0.05)

      -- ── Signal 6: Recency boost (max 0.05, decays over 1 year) ───────
      + GREATEST(0, (1.0 - EXTRACT(EPOCH FROM (now() - p.created_at)) / 31536000.0)) * 0.05

    )::real AS rank_score

  FROM public.pins p
  WHERE p.is_published = true
    AND (
      -- Match if ANY signal fires: trigram similarity OR FTS match OR ILIKE fallback
      similarity(p.title, query_norm) > 0.08
      OR similarity(p.description, query_norm) > 0.08
      OR (tsq IS NOT NULL AND p.fts @@ tsq)
      OR p.title ILIKE '%' || query_norm || '%'
      OR p.description ILIKE '%' || query_norm || '%'
      -- Also check individual tokens for multi-word queries
      OR EXISTS (
        SELECT 1 FROM unnest(tokens) AS tok
        WHERE p.title ILIKE '%' || tok || '%'
           OR p.description ILIKE '%' || tok || '%'
      )
      -- Tag match
      OR EXISTS (
        SELECT 1
        FROM public.pin_tags pt
        JOIN public.tags t ON t.id = pt.tag_id
        WHERE pt.pin_id = p.id
          AND t.name = ANY(tokens)
      )
    )
    -- Optional tag filter
    AND (
      tag_filter = ''
      OR EXISTS (
        SELECT 1
        FROM public.pin_tags pt
        JOIN public.tags t ON t.id = pt.tag_id
        WHERE pt.pin_id = p.id
          AND t.name = lower(tag_filter)
      )
    )
  ORDER BY rank_score DESC, p.created_at DESC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$;

-- ── Autocomplete suggestions RPC ────────────────────────────────────────────
-- Returns top matching tags, pin titles, and usernames for typeahead.

CREATE OR REPLACE FUNCTION public.search_suggestions(
  query_text text,
  max_results integer DEFAULT 8
)
RETURNS TABLE (
  suggestion_type text,   -- 'tag', 'title', or 'user'
  suggestion_text text,
  similarity_score real,
  extra_id        text    -- tag id, pin id, or username
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q text;
BEGIN
  q := lower(trim(query_text));
  IF length(q) < 1 THEN RETURN; END IF;

  RETURN QUERY

  -- Tags matching by trigram or prefix
  (
    SELECT
      'tag'::text,
      t.name,
      similarity(t.name, q),
      t.id::text
    FROM public.tags t
    WHERE similarity(t.name, q) > 0.15 OR t.name ILIKE q || '%'
    ORDER BY similarity(t.name, q) DESC
    LIMIT max_results
  )

  UNION ALL

  -- Pin titles matching by trigram
  (
    SELECT
      'title'::text,
      p.title,
      similarity(p.title, q),
      p.id::text
    FROM public.pins p
    WHERE p.is_published = true
      AND (similarity(p.title, q) > 0.15 OR p.title ILIKE '%' || q || '%')
    ORDER BY similarity(p.title, q) DESC, p.likes_count DESC
    LIMIT max_results
  )

  UNION ALL

  -- Usernames matching by trigram or prefix
  (
    SELECT
      'user'::text,
      pr.username,
      similarity(pr.username, q),
      pr.username
    FROM public.profiles pr
    WHERE similarity(pr.username, q) > 0.2 OR pr.username ILIKE q || '%'
    ORDER BY similarity(pr.username, q) DESC
    LIMIT max_results
  );
END;
$$;
