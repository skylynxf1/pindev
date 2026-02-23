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

