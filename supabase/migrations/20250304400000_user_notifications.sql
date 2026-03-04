-- Migration: create user_notifications table

CREATE TABLE IF NOT EXISTS public.user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS user_notifications_user_id_idx ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS user_notifications_is_read_idx ON public.user_notifications(is_read);

-- Enable RLS
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Policies

-- 1. Users can view their own notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.user_notifications;
CREATE POLICY "Users can view their own notifications" ON public.user_notifications
    FOR SELECT
    USING (auth.uid() = (SELECT clerk_id FROM public.profiles WHERE id = user_id LIMIT 1));

-- 2. Users can mark their own notifications as read
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.user_notifications;
CREATE POLICY "Users can update their own notifications" ON public.user_notifications
    FOR UPDATE
    USING (auth.uid() = (SELECT clerk_id FROM public.profiles WHERE id = user_id LIMIT 1))
    WITH CHECK (auth.uid() = (SELECT clerk_id FROM public.profiles WHERE id = user_id LIMIT 1));

-- 3. Only Service Role can insert/delete (handled automatically by bypassing RLS or explicit policies if needed)
-- For Supabase, the generated service_role key bypasses RLS, so no explicit policy is strictly required
-- But for admins, let's add an explicit policy if they act through the dashboard:
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.user_notifications;
CREATE POLICY "Admins can insert notifications" ON public.user_notifications
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE clerk_id = auth.uid() AND role = 'admin'
        )
    );
