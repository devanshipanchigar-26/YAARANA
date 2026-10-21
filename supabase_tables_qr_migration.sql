-- ==============================================================================
-- YAARANA Cafe: Tables & QR Code Management Migration
-- Run this script in your Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. Ensure columns exist on public.cafe_tables
ALTER TABLE public.cafe_tables 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS qr_token UUID NOT NULL DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Indexes for fast retrieval
CREATE INDEX IF NOT EXISTS idx_cafe_tables_active ON public.cafe_tables(is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cafe_tables_unique_no ON public.cafe_tables(table_no);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.cafe_tables ENABLE ROW LEVEL SECURITY;

-- 4. Clean up any existing policies
DROP POLICY IF EXISTS "Public can view active cafe tables" ON public.cafe_tables;
DROP POLICY IF EXISTS "Admins have full access to cafe tables" ON public.cafe_tables;
DROP POLICY IF EXISTS "Allow manage cafe tables" ON public.cafe_tables;

-- 5. Public Read Policy:
-- Unauthenticated guests and customers can query active cafe tables to validate table numbers
CREATE POLICY "Public can view active cafe tables"
ON public.cafe_tables FOR SELECT
USING (is_active = true);

-- 6. Admin & Management Policy:
-- Authorized administrators and dev dashboard can manage tables
CREATE POLICY "Allow manage cafe tables"
ON public.cafe_tables FOR ALL
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
