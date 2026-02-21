-- ============================================================
-- PinDev · 0004_pin_drafts.sql
-- Stores agent-submitted pin drafts awaiting admin review/publish
-- ============================================================

create table if not exists public.pin_drafts (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  live_url     text,
  repo_url     text,
  image_url    text,
  video_url    text,
  tags         text[] not null default '{}',
  source_url   text,
  status       text not null default 'PENDING',
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now(),

  constraint pin_drafts_status_values check (status in ('PENDING', 'PUBLISHED', 'REJECTED')),
  constraint pin_drafts_title_length  check (char_length(title) between 1 and 120),
  constraint pin_drafts_has_media     check (image_url is not null or video_url is not null)
);

create index idx_pin_drafts_status     on public.pin_drafts (status);
create index idx_pin_drafts_created_at on public.pin_drafts (created_at desc);

-- Service-role key bypasses RLS, so admin client can always read/write.
-- RLS is still enabled so anon/user keys cannot touch drafts at all.
alter table public.pin_drafts enable row level security;

-- No public policies — only the service-role key (admin client) has access.
