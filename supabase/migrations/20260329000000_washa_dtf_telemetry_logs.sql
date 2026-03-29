-- Migration: 20260329000000_washa_dtf_telemetry_logs
-- Description: Creates the telemetry logging table for DTF Studio generative requests to enforce daily quotas and provide admin observability.

CREATE TABLE IF NOT EXISTS public.dtf_studio_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    clerk_id TEXT,
    action TEXT NOT NULL,
    status TEXT NOT NULL,
    prompt TEXT,
    reference_image_url TEXT,
    result_image_url TEXT,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indices for fast daily quota checking and dashboard querying
CREATE INDEX IF NOT EXISTS idx_dtf_logs_profile_id ON public.dtf_studio_activity_logs(profile_id);
CREATE INDEX IF NOT EXISTS idx_dtf_logs_created_at ON public.dtf_studio_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dtf_logs_status ON public.dtf_studio_activity_logs(status);
CREATE INDEX IF NOT EXISTS idx_dtf_logs_action ON public.dtf_studio_activity_logs(action);

-- RLS: Only admins can view, inserting is handled securely via the Service Role inside the API route.
ALTER TABLE public.dtf_studio_activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all telemetry logs" ON public.dtf_studio_activity_logs;
CREATE POLICY "Admins can view all telemetry logs"
    ON public.dtf_studio_activity_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'wushsha')
        )
    );

-- Users can view their own telemetry logs
DROP POLICY IF EXISTS "Users can view their own telemetry logs" ON public.dtf_studio_activity_logs;
CREATE POLICY "Users can view their own telemetry logs"
    ON public.dtf_studio_activity_logs
    FOR SELECT
    USING (
        profile_id = auth.uid()
    );

-- Allow service role to insert logs
DROP POLICY IF EXISTS "Service role can orchestrate logs" ON public.dtf_studio_activity_logs;
CREATE POLICY "Service role can orchestrate logs"
    ON public.dtf_studio_activity_logs
    FOR ALL
    USING (true)
    WITH CHECK (true);
