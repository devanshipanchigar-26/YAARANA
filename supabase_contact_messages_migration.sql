-- ==============================================================================
-- YAARANA Cafe: Contact Us Customer Messages & Inquiries Migration
-- Run this script in your Supabase Dashboard -> SQL Editor
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unread', -- 'unread' | 'read' | 'resolved'
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_contact_messages_created ON public.contact_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON public.contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_user_id ON public.contact_messages(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- 1. Public insert policy: Customers & guests can submit inquiries
DROP POLICY IF EXISTS "Anyone can insert contact messages" ON public.contact_messages;
CREATE POLICY "Anyone can insert contact messages"
ON public.contact_messages FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 2. Authenticated customers can view their own inquiries
DROP POLICY IF EXISTS "Users can view their own contact messages" ON public.contact_messages;
CREATE POLICY "Users can view their own contact messages"
ON public.contact_messages FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 3. Admins have full access to view, update status, and manage inquiries
DROP POLICY IF EXISTS "Admins have full access to contact messages" ON public.contact_messages;
CREATE POLICY "Admins have full access to contact messages"
ON public.contact_messages FOR ALL
TO anon, authenticated
USING (
  auth.uid() IS NULL 
  OR EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND (users.role = 'admin' OR users.email = 'devanshipanchigar@gmail.com')
  )
)
WITH CHECK (
  auth.uid() IS NULL 
  OR EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND (users.role = 'admin' OR users.email = 'devanshipanchigar@gmail.com')
  )
);
