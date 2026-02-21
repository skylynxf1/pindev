-- follows
create table public.follows (
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint no_self_follow check (follower_id != following_id)
);
create index idx_follows_follower_id  on public.follows (follower_id);
create index idx_follows_following_id on public.follows (following_id);

-- blocks
create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint no_self_block check (blocker_id != blocked_id)
);
create index idx_blocks_blocker_id on public.blocks (blocker_id);
create index idx_blocks_blocked_id on public.blocks (blocked_id);

-- RLS: follows
alter table public.follows enable row level security;
-- Anyone can read follow relationships (for public counts/lists)
create policy "follows: public read" on public.follows for select using (true);
-- Authenticated user can follow others (insert own follower_id row)
create policy "follows: authenticated insert" on public.follows for insert
  with check (auth.uid() = follower_id);
-- User can unfollow (delete own follower_id row)
create policy "follows: owner delete" on public.follows for delete
  using (auth.uid() = follower_id);

-- RLS: blocks
alter table public.blocks enable row level security;
-- Users can only see their own blocks
create policy "blocks: owner read" on public.blocks for select
  using (auth.uid() = blocker_id or auth.uid() = blocked_id);
create policy "blocks: owner insert" on public.blocks for insert
  with check (auth.uid() = blocker_id);
create policy "blocks: owner delete" on public.blocks for delete
  using (auth.uid() = blocker_id);
