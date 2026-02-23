-- Remove the blocks feature entirely: drop all data, policies, indexes, and the table.
drop policy if exists "blocks: owner read"   on public.blocks;
drop policy if exists "blocks: owner insert" on public.blocks;
drop policy if exists "blocks: owner delete" on public.blocks;
drop index  if exists idx_blocks_blocker_id;
drop index  if exists idx_blocks_blocked_id;
drop table  if exists public.blocks;
