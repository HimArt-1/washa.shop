-- Normalize profile emails and prepare for future uniqueness enforcement.

UPDATE public.profiles
SET email = lower(trim(email))
WHERE email IS NOT NULL
  AND email <> lower(trim(email));

CREATE INDEX IF NOT EXISTS profiles_email_normalized_idx
ON public.profiles (lower(email))
WHERE email IS NOT NULL;
