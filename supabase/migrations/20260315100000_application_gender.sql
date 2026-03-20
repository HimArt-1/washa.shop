-- Add gender to applications for improved intake profiling.

ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS gender TEXT;

ALTER TABLE public.applications
DROP CONSTRAINT IF EXISTS applications_gender_check;

ALTER TABLE public.applications
ADD CONSTRAINT applications_gender_check
CHECK (gender IN ('male', 'female') OR gender IS NULL);
