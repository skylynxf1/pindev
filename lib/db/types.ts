/**
 * Lightweight DB-layer types that sit below the application-level
 * types in src/types/index.ts.  These describe exactly what each
 * query returns so callers never have to cast raw Supabase rows.
 */

export type DbProfile = {
  id: string
  username: string
  display_name: string
  bio: string
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export type DbPin = {
  id: string
  owner_id: string
  title: string
  description: string
  live_url: string
  repo_url: string | null
  media_url: string
  media_type: 'image' | 'video'
  thumbnail_url: string
  is_published: boolean
  created_at: string
  updated_at: string
  // ranking
  likes_count: number
  clicks_count: number
  impressions_count: number
  has_video: boolean
  admin_pinned_position: number | null
  admin_pinned_until: string | null
}

export type DbTag = {
  id: string
  name: string
}

export type DbBoard = {
  id: string
  owner_id: string
  name: string
  description: string
  is_private: boolean
  created_at: string
  updated_at: string
}

export type DbBoardPin = {
  board_id: string
  pin_id: string
  saved_at: string
}

// ── Joined shapes returned by specific queries ────────────────────────────────

export type DbPinWithRelations = DbPin & {
  profile: Pick<DbProfile, 'username' | 'display_name' | 'avatar_url'> | null
  tags: DbTag[]
}

// ── Pagination cursor ─────────────────────────────────────────────────────────

export type CursorPage = {
  cursor: string | null   // value of the last row's sort column (ISO timestamp)
  limit: number
}

// ── Search params ─────────────────────────────────────────────────────────────

export type PinSearchParams = {
  keyword?: string        // full-text search against title + description
  tag?: string            // single tag slug filter
  cursor?: string | null  // created_at cursor for pagination
  offset?: number         // offset-based pagination
  limit?: number
}

// ── Generic query result wrapper ──────────────────────────────────────────────

export type QueryResult<T> =
  | { data: T; error: null }
  | { data: null; error: string }