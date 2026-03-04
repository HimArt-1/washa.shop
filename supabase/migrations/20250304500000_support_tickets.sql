-- Migration: support_tickets & support_messages

CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
    priority TEXT NOT NULL DEFAULT 'normal', -- 'low', 'normal', 'high'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_admin_reply BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON public.support_messages(ticket_id);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Policies for Tickets
DROP POLICY IF EXISTS "Users can view own tickets" ON public.support_tickets;
CREATE POLICY "Users can view own tickets" ON public.support_tickets FOR SELECT
    USING (auth.uid() = (SELECT clerk_id FROM public.profiles WHERE id = user_id LIMIT 1));

DROP POLICY IF EXISTS "Users can insert own tickets" ON public.support_tickets;
CREATE POLICY "Users can insert own tickets" ON public.support_tickets FOR INSERT
    WITH CHECK (auth.uid() = (SELECT clerk_id FROM public.profiles WHERE id = user_id LIMIT 1));

DROP POLICY IF EXISTS "Admins can view and update all tickets" ON public.support_tickets;
CREATE POLICY "Admins can view and update all tickets" ON public.support_tickets FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE clerk_id = auth.uid() AND role = 'admin'));

-- Policies for Messages
DROP POLICY IF EXISTS "Users can view messages for own tickets" ON public.support_messages;
CREATE POLICY "Users can view messages for own tickets" ON public.support_messages FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.support_tickets t
        JOIN public.profiles p ON t.user_id = p.id
        WHERE t.id = ticket_id AND p.clerk_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can insert messages to own tickets" ON public.support_messages;
CREATE POLICY "Users can insert messages to own tickets" ON public.support_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.support_tickets t
            JOIN public.profiles p ON t.user_id = p.id
            WHERE t.id = ticket_id AND p.clerk_id = auth.uid()
        ) AND
        auth.uid() = (SELECT clerk_id FROM public.profiles WHERE id = sender_id LIMIT 1)
    );

DROP POLICY IF EXISTS "Admins can view and insert all messages" ON public.support_messages;
CREATE POLICY "Admins can view and insert all messages" ON public.support_messages FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE clerk_id = auth.uid() AND role = 'admin'));
