-- ============================================================
-- PinDev · 0008_search_v2.sql
-- Fixes broken search ranking by separating original query
-- (for trigram scoring) from expanded query (for broadening).
-- Replaces search_pins_ranked with per-token trigram scoring,
-- improved FTS with OR-based expansion, and better filtering.
-- ============================================================

-- ── Drop the old function signature ───────────────────────────────────────────
-- Old signature: (text, text, integer, integer) — must be dropped before
-- creating new signature with different parameter count.
DROP FUNCTION IF EXISTS public.search_pins_ranked(text, text, integer, integer);

-- ── Improved hybrid search RPC ────────────────────────────────────────────────
-- Key changes from v1:
--   1. Accepts original_query (for trigram) AND expanded_query (for broadening)
--   2. Per-token trigram scoring — MAX similarity across individual tokens,
--      not the full expanded string (which killed scoring before)
--   3. FTS uses expanded tsquery with OR logic for broader recall
--   4. ILIKE filtering uses original tokens only (avoids synonym false positives)
--   5. Tag matching uses expanded tokens (broader discovery)
--   6. Tag boost capped at 0.30 (max 2 tags)

CREATE OR REPLACE FUNCTION public.search_pins_ranked(
  original_query text,
  expanded_query text    DEFAULT '',
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
  orig_norm    text;
  orig_tokens  text[];
  all_tokens   text[];
  tsq          tsquery;
  expanded_tsq tsquery;
BEGIN
  -- ── Normalize original query ────────────────────────────────────────────────
  orig_norm := lower(trim(original_query));
  IF orig_norm = '' OR orig_norm IS NULL THEN RETURN; END IF;

  -- ── Parse original tokens (what user actually typed) ────────────────────────
  orig_tokens := string_to_array(regexp_replace(orig_norm, '\s+', ' ', 'g'), ' ');
  orig_tokens := array(SELECT t FROM unnest(orig_tokens) AS t WHERE length(t) > 0);

  -- ── Parse all tokens (original + synonyms + stems from caller) ──────────────
  IF expanded_query IS NOT NULL AND trim(expanded_query) <> '' THEN
    all_tokens := string_to_array(
      regexp_replace(lower(trim(expanded_query)), '\s+', ' ', 'g'), ' '
    );
    all_tokens := array(SELECT t FROM unnest(all_tokens) AS t WHERE length(t) > 0);
  ELSE
    all_tokens := orig_tokens;
  END IF;

  -- ── Build FTS query from original (precise phrase matching) ─────────────────
  BEGIN
    tsq := websearch_to_tsquery('english', orig_norm);
  EXCEPTION WHEN OTHERS THEN
    tsq := plainto_tsquery('english', orig_norm);
  END;

  -- ── Build expanded FTS query (OR logic across all expanded tokens) ──────────
  -- websearch_to_tsquery understands "OR" keyword for disjunction
  BEGIN
    expanded_tsq := websearch_to_tsquery('english',
      array_to_string(all_tokens, ' OR ')
    );
  EXCEPTION WHEN OTHERS THEN
    expanded_tsq := plainto_tsquery('english', COALESCE(expanded_query, orig_norm));
  END;

  -- ── Main query: filter candidates, score, rank ──────────────────────────────
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
      -- ── Signal 1: Trigram similarity on TITLE (weight 0.35) ─────────────
      -- Per-token MAX across original tokens + full original string,
      -- whichever is higher. This ensures both "net" → Netflix and
      -- "netflix wrapped" → Netflix Wrapped score well.
      GREATEST(
        COALESCE(similarity(p.title, orig_norm), 0),
        COALESCE((
          SELECT MAX(similarity(p.title, tok))
          FROM unnest(orig_tokens) AS tok
        ), 0)
      ) * 0.35

      -- ── Signal 2: Trigram similarity on DESCRIPTION (weight 0.10) ───────
      + GREATEST(
        COALESCE(similarity(p.description, orig_norm), 0),
        COALESCE((
          SELECT MAX(similarity(p.description, tok))
          FROM unnest(orig_tokens) AS tok
        ), 0)
      ) * 0.10

      -- ── Signal 3: Full-text search rank (weight 0.30) ──────────────────
      -- Original query match gets full weight; expanded fallback gets 0.20
      + CASE
          WHEN tsq IS NOT NULL AND p.fts @@ tsq
          THEN LEAST(ts_rank_cd(p.fts, tsq, 32), 1.0) * 0.30
          WHEN expanded_tsq IS NOT NULL AND p.fts @@ expanded_tsq
          THEN LEAST(ts_rank_cd(p.fts, expanded_tsq, 32), 1.0) * 0.20
          ELSE 0
        END

      -- ── Signal 4: Tag exact match boost (0.15 per tag, capped at 0.30) ─
      + LEAST(COALESCE((
          SELECT SUM(0.15)
          FROM public.pin_tags pt
          JOIN public.tags t ON t.id = pt.tag_id
          WHERE pt.pin_id = p.id
            AND t.name = ANY(all_tokens)
        ), 0), 0.30)

      -- ── Signal 5: Popularity boost (log-scaled, capped at 0.05) ────────
      + LEAST(ln(GREATEST(p.likes_count, 0) + 1) * 0.01, 0.05)

      -- ── Signal 6: Recency boost (max 0.05, linear decay over 1 year) ───
      + GREATEST(0, (1.0 - EXTRACT(EPOCH FROM (now() - p.created_at)) / 31536000.0)) * 0.05

    )::real AS rank_score

  FROM public.pins p
  WHERE p.is_published = true
    AND (
      -- ── Candidate filtering: match if ANY signal fires ──────────────────
      -- Uses index-friendly operations where possible.

      -- FTS match on original query (uses GIN idx_pins_fts)
      (tsq IS NOT NULL AND p.fts @@ tsq)

      -- FTS match on expanded query (broader recall via synonyms/stems)
      OR (expanded_tsq IS NOT NULL AND p.fts @@ expanded_tsq)

      -- ILIKE on original tokens only (uses GIN trigram indexes)
      -- Avoids false positives from synonym expansion
      OR EXISTS (
        SELECT 1 FROM unnest(orig_tokens) AS tok
        WHERE p.title ILIKE '%' || tok || '%'
           OR p.description ILIKE '%' || tok || '%'
      )

      -- Tag match on ALL tokens (expanded broadens tag discovery)
      OR EXISTS (
        SELECT 1
        FROM public.pin_tags pt
        JOIN public.tags t ON t.id = pt.tag_id
        WHERE pt.pin_id = p.id
          AND t.name = ANY(all_tokens)
      )
    )
    -- ── Optional tag filter ─────────────────────────────────────────────────
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

-- ── Improved suggestions RPC ──────────────────────────────────────────────────
-- Adds prefix-first ordering so typing "ne" shows "netflix" before less
-- relevant trigram matches.

CREATE OR REPLACE FUNCTION public.search_suggestions(
  query_text text,
  max_results integer DEFAULT 8
)
RETURNS TABLE (
  suggestion_type text,
  suggestion_text text,
  similarity_score real,
  extra_id        text
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

  -- Tags matching by prefix or trigram
  (
    SELECT
      'tag'::text,
      t.name,
      CASE WHEN t.name ILIKE q || '%' THEN 1.0 ELSE similarity(t.name, q) END,
      t.id::text
    FROM public.tags t
    WHERE similarity(t.name, q) > 0.12 OR t.name ILIKE q || '%'
    ORDER BY
      (t.name ILIKE q || '%') DESC,
      similarity(t.name, q) DESC
    LIMIT max_results
  )

  UNION ALL

  -- Pin titles matching by prefix or trigram
  (
    SELECT
      'title'::text,
      p.title,
      CASE WHEN lower(p.title) ILIKE q || '%' THEN 1.0 ELSE similarity(p.title, q) END,
      p.id::text
    FROM public.pins p
    WHERE p.is_published = true
      AND (similarity(p.title, q) > 0.12 OR p.title ILIKE '%' || q || '%')
    ORDER BY
      (lower(p.title) ILIKE q || '%') DESC,
      similarity(p.title, q) DESC,
      p.likes_count DESC
    LIMIT max_results
  )

  UNION ALL

  -- Usernames matching by prefix or trigram
  (
    SELECT
      'user'::text,
      pr.username,
      CASE WHEN pr.username ILIKE q || '%' THEN 1.0 ELSE similarity(pr.username, q) END,
      pr.username
    FROM public.profiles pr
    WHERE similarity(pr.username, q) > 0.15 OR pr.username ILIKE q || '%'
    ORDER BY
      (pr.username ILIKE q || '%') DESC,
      similarity(pr.username, q) DESC
    LIMIT max_results
  );
END;
$$;
