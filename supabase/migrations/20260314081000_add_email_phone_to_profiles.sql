-- Add email and phone columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email VARCHAR(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS phone VARCHAR(255) DEFAULT NULL;
