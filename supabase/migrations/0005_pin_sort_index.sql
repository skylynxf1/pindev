-- ============================================================
-- PinDev · 0005_pin_sort_index.sql
-- Adds a sort_index column to pins for admin-controlled feed ordering.
-- Pins with a sort_index appear first (ASC); nulls fall back to created_at DESC.
-- ============================================================

ALTER TABLE public.pins ADD COLUMN IF NOT EXISTS sort_index INTEGER DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_pins_sort_index ON public.pins (sort_index ASC NULLS LAST);
