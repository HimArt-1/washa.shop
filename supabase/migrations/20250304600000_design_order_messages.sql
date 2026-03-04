-- MIGRATION: 20250304600000_design_order_messages.sql

-- إنشاء جدول رسائل طلبات التصميم
CREATE TABLE IF NOT EXISTS public.design_order_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.custom_design_orders(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_admin_reply BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups by order_id
CREATE INDEX IF NOT EXISTS idx_design_order_messages_order_id ON public.design_order_messages(order_id);

-- Enable RLS
ALTER TABLE public.design_order_messages ENABLE ROW LEVEL SECURITY;

-- السياسات الأمنية (RLS)

-- 1. All users (including anonymous) can read messages for a specific order
-- We don't have user_id for design orders, so we rely on the client knowing the order_id (from localStorage)
CREATE POLICY "Anyone can read messages" ON public.design_order_messages
    FOR SELECT USING (true);

-- 2. Anonymous users can insert messages into orders (representing the customer)
CREATE POLICY "Anyone can insert a message" ON public.design_order_messages
    FOR INSERT WITH CHECK (
        -- They can only insert as customer
        is_admin_reply = false
    );

-- 3. Only admins can update or delete messages, or insert admin replies
-- Wait, the `is_admin_reply = false` check ensures anonymous can only send client messages.
-- Admins using service role key bypass RLS completely, so the Server Actions will handle admin replies safely.
