-- ==============================================================================
-- YAARANA Cafe: Table Reservations Customer Ownership & RLS Migration
-- Run this in your Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. Add user_id column to table_reservations referencing auth.users
ALTER TABLE public.table_reservations 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Create index for fast customer booking lookup
CREATE INDEX IF NOT EXISTS idx_table_reservations_user_id 
ON public.table_reservations(user_id);

-- 3. Enable Row Level Security (RLS) on table_reservations
ALTER TABLE public.table_reservations ENABLE ROW LEVEL SECURITY;

-- 4. Drop any existing conflicting policies if re-running
DROP POLICY IF EXISTS "Users can view their own reservations" ON public.table_reservations;
DROP POLICY IF EXISTS "Users can insert their own reservations" ON public.table_reservations;
DROP POLICY IF EXISTS "Users can cancel their own active reservations" ON public.table_reservations;
DROP POLICY IF EXISTS "Admins have full access to table_reservations" ON public.table_reservations;
DROP POLICY IF EXISTS "Anon can insert reservations" ON public.table_reservations;

-- 5. Customer Policy: Users can view only their own reservations
CREATE POLICY "Users can view their own reservations"
ON public.table_reservations FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 6. Customer Policy: Logged-in users can insert reservations assigned to their account
CREATE POLICY "Users can insert their own reservations"
ON public.table_reservations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 7. Customer Policy: Users can cancel their own active reservations
CREATE POLICY "Users can cancel their own active reservations"
ON public.table_reservations FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status = 'Confirmed')
WITH CHECK (auth.uid() = user_id AND status = 'Cancelled');

-- 8. Admin Policy: Admins have full access to view, update, and manage all reservations
CREATE POLICY "Admins have full access to table_reservations"
ON public.table_reservations FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);
