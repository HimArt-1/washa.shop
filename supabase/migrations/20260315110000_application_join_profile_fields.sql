-- Add strategic intake fields to applications.

ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS join_type TEXT,
ADD COLUMN IF NOT EXISTS birth_date DATE;

ALTER TABLE public.applications
DROP CONSTRAINT IF EXISTS applications_join_type_check;

ALTER TABLE public.applications
ADD CONSTRAINT applications_join_type_check
CHECK (join_type IN ('artist', 'designer', 'model', 'customer', 'partner') OR join_type IS NULL);
