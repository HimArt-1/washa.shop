-- Explicit operator rollback for the WASHA board-generation fallback table.
-- Keep this file outside supabase/migrations so it is never applied forward.

UPDATE public.site_settings
SET value = to_jsonb('primary'::text),
    updated_at = now()
WHERE key = 'generation_mode';

DROP TABLE IF EXISTS public.washa_board_requests;

NOTIFY pgrst, 'reload schema';
