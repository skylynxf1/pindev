-- ============================================================
-- PinDev · 0001_init.sql
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "pgcrypto";


-- ============================================================
-- TABLES
-- ============================================================

-- profiles -------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text not null unique,
  display_name text not null default '',
  bio          text not null default '',
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint username_length   check (char_length(username) between 2 and 30),
  constraint username_format   check (username ~ '^[a-z0-9_]+$'),
  constraint display_name_length check (char_length(display_name) <= 60),
  constraint bio_length        check (char_length(bio) <= 300)
);

-- pins -----------------------------------------------------
create table public.pins (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  title        text not null,
  description  text not null default '',
  live_url     text not null,
  repo_url     text,
  media_url    text not null,
  media_type   text not null,           -- 'image' | 'video'
  thumbnail_url text not null,
  is_published boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint title_length       check (char_length(title) between 1 and 120),
  constraint description_length check (char_length(description) <= 2000),
  constraint media_type_values  check (media_type in ('image', 'video'))
);

-- tags -----------------------------------------------------
create table public.tags (
  id   uuid primary key default gen_random_uuid(),
  name text not null unique,

  constraint tag_name_length check (char_length(name) between 1 and 40),
  constraint tag_name_format check (name ~ '^[a-z0-9\-]+$')
);

-- pin_tags -------------------------------------------------
create table public.pin_tags (
  pin_id uuid not null references public.pins(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (pin_id, tag_id)
);

-- boards ---------------------------------------------------
create table public.boards (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references public.profiles(id) on delete cascade,
  name       text not null,
  description text not null default '',
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint board_name_length        check (char_length(name) between 1 and 80),
  constraint board_description_length check (char_length(description) <= 500)
);

-- board_pins -----------------------------------------------
create table public.board_pins (
  board_id   uuid not null references public.boards(id) on delete cascade,
  pin_id     uuid not null references public.pins(id) on delete cascade,
  saved_at   timestamptz not null default now(),
  primary key (board_id, pin_id)
);


-- ============================================================
-- INDEXES
-- ============================================================

-- profiles
create index idx_profiles_username    on public.profiles (username);

-- pins
create index idx_pins_owner_id        on public.pins (owner_id);
create index idx_pins_created_at      on public.pins (created_at desc);
create index idx_pins_is_published    on public.pins (is_published);

-- tags
create index idx_tags_name            on public.tags (name);

-- pin_tags
create index idx_pin_tags_tag_id      on public.pin_tags (tag_id);
create index idx_pin_tags_pin_id      on public.pin_tags (pin_id);

-- boards
create index idx_boards_owner_id      on public.boards (owner_id);
create index idx_boards_is_private    on public.boards (is_private);

-- board_pins
create index idx_board_pins_board_id  on public.board_pins (board_id);
create index idx_board_pins_pin_id    on public.board_pins (pin_id);


-- ============================================================
-- UPDATED_AT TRIGGER (shared helper)
-- ============================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger trg_pins_updated_at
  before update on public.pins
  for each row execute function public.set_updated_at();

create trigger trg_boards_updated_at
  before update on public.boards
  for each row execute function public.set_updated_at();


-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
-- Fires after a new auth.users row is inserted (e.g. OAuth or email).
-- Derives a safe default username from the email local-part; the user
-- can change it later on the settings page.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public as $$
declare
  base_username text;
  final_username text;
  counter       int := 0;
begin
  -- strip everything after @ and remove disallowed chars
  base_username := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9_]', '', 'g'));

  -- ensure minimum length
  if char_length(base_username) < 2 then
    base_username := 'user';
  end if;

  -- truncate to 28 chars so we have room for a numeric suffix
  base_username := left(base_username, 28);

  final_username := base_username;

  -- resolve collisions
  loop
    exit when not exists (select 1 from public.profiles where username = final_username);
    counter := counter + 1;
    final_username := base_username || counter::text;
  end loop;

  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    final_username,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')
  );

  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================
-- ROW LEVEL SECURITY — ENABLE
-- ============================================================

alter table public.profiles  enable row level security;
alter table public.pins      enable row level security;
alter table public.tags      enable row level security;
alter table public.pin_tags  enable row level security;
alter table public.boards    enable row level security;
alter table public.board_pins enable row level security;


-- ============================================================
-- RLS POLICIES · profiles
-- ============================================================

-- Anyone (including anonymous) can read any profile.
create policy "profiles: public read"
  on public.profiles for select
  using (true);

-- A user may only update their own profile row.
create policy "profiles: owner update"
  on public.profiles for update
  using  (auth.uid() = id)
  with check (auth.uid() = id);

-- The insert is handled exclusively by the trigger above, so we
-- do NOT add an insert policy here (users cannot manually insert).


-- ============================================================
-- RLS POLICIES · pins
-- ============================================================

-- Published pins are publicly readable.
create policy "pins: public read published"
  on public.pins for select
  using (is_published = true);

-- Owners can always see all their own pins (incl. drafts).
create policy "pins: owner read own"
  on public.pins for select
  using (auth.uid() = owner_id);

-- Authenticated users can create pins for themselves.
create policy "pins: owner insert"
  on public.pins for insert
  with check (auth.uid() = owner_id);

-- Owners can update their own pins.
create policy "pins: owner update"
  on public.pins for update
  using  (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Owners can delete their own pins.
create policy "pins: owner delete"
  on public.pins for delete
  using (auth.uid() = owner_id);


-- ============================================================
-- RLS POLICIES · tags
-- ============================================================

-- Tags are global reference data — everyone can read them.
create policy "tags: public read"
  on public.tags for select
  using (true);

-- Any authenticated user can create a new tag (upsert on name).
create policy "tags: authenticated insert"
  on public.tags for insert
  with check (auth.role() = 'authenticated');


-- ============================================================
-- RLS POLICIES · pin_tags
-- ============================================================

-- A pin_tag row is readable when the underlying pin is readable.
-- We re-use the same published/owner logic via a sub-select.
create policy "pin_tags: readable with pin"
  on public.pin_tags for select
  using (
    exists (
      select 1 from public.pins p
      where p.id = pin_id
        and (p.is_published = true or p.owner_id = auth.uid())
    )
  );

-- Only the pin owner can attach tags to their pin.
create policy "pin_tags: owner insert"
  on public.pin_tags for insert
  with check (
    exists (
      select 1 from public.pins p
      where p.id = pin_id
        and p.owner_id = auth.uid()
    )
  );

-- Only the pin owner can detach tags from their pin.
create policy "pin_tags: owner delete"
  on public.pin_tags for delete
  using (
    exists (
      select 1 from public.pins p
      where p.id = pin_id
        and p.owner_id = auth.uid()
    )
  );


-- ============================================================
-- RLS POLICIES · boards
-- ============================================================

-- Public boards are readable by everyone.
create policy "boards: public read public boards"
  on public.boards for select
  using (is_private = false);

-- Owners can always read their own boards (public or private).
create policy "boards: owner read own"
  on public.boards for select
  using (auth.uid() = owner_id);

-- Authenticated users can create boards for themselves.
create policy "boards: owner insert"
  on public.boards for insert
  with check (auth.uid() = owner_id);

-- Owners can update their own boards.
create policy "boards: owner update"
  on public.boards for update
  using  (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Owners can delete their own boards.
create policy "boards: owner delete"
  on public.boards for delete
  using (auth.uid() = owner_id);


-- ============================================================
-- RLS POLICIES · board_pins
-- ============================================================

-- A board_pin row is readable when the parent board is readable
-- (public board, or the viewer is the board owner).
create policy "board_pins: readable with board"
  on public.board_pins for select
  using (
    exists (
      select 1 from public.boards b
      where b.id = board_id
        and (b.is_private = false or b.owner_id = auth.uid())
    )
  );

-- Only the board owner can save a pin to their board.
create policy "board_pins: owner insert"
  on public.board_pins for insert
  with check (
    exists (
      select 1 from public.boards b
      where b.id = board_id
        and b.owner_id = auth.uid()
    )
  );

-- Only the board owner can remove a pin from their board.
create policy "board_pins: owner delete"
  on public.board_pins for delete
  using (
    exists (
      select 1 from public.boards b
      where b.id = board_id
        and b.owner_id = auth.uid()
    )
  );