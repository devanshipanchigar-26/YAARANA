-- ==============================================================================
-- YAARANA Cafe: Specials Management & Storage Migration (Fixed RLS)
-- Run this script in your Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. Ensure Devanshi's account has Admin role in public.users
UPDATE public.users 
SET role = 'admin' 
WHERE email = 'devanshipanchigar@gmail.com';

-- 2. Create public.specials table
CREATE TABLE IF NOT EXISTS public.specials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id INTEGER REFERENCES public.menu_items(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  badge_text TEXT,                       -- Optional promo tag (e.g. "Chef Special", "Trending", "Must Try")
  display_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,       -- Controls customer-facing website visibility
  is_available BOOLEAN NOT NULL DEFAULT true,     -- Controls ordering availability
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all necessary columns exist if table was already created
ALTER TABLE public.specials ADD COLUMN IF NOT EXISTS menu_item_id INTEGER REFERENCES public.menu_items(id) ON DELETE SET NULL;
ALTER TABLE public.specials ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT 'Special Item';
ALTER TABLE public.specials ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.specials ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.specials ADD COLUMN IF NOT EXISTS badge_text TEXT;
ALTER TABLE public.specials ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.specials ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.specials ADD COLUMN IF NOT EXISTS is_available BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.specials ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.specials ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Indexes for fast retrieval and sorting
CREATE INDEX IF NOT EXISTS idx_specials_visibility_order ON public.specials(is_visible, display_order);
CREATE INDEX IF NOT EXISTS idx_specials_menu_item_id ON public.specials(menu_item_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.specials ENABLE ROW LEVEL SECURITY;

-- 5. Clean up any existing policies
DROP POLICY IF EXISTS "Public can view visible specials" ON public.specials;
DROP POLICY IF EXISTS "Admins have full access to specials" ON public.specials;
DROP POLICY IF EXISTS "Allow manage specials" ON public.specials;

-- 6. Public Read Policy:
-- Unauthenticated guests and customers can query visible specials on the customer website
CREATE POLICY "Public can view visible specials"
ON public.specials FOR SELECT
USING (is_visible = true);

-- 7. Admin & Development Management Policy:
-- Allows full access for authenticated admins, Devanshi's account, and anon admin panel testing
CREATE POLICY "Allow manage specials"
ON public.specials FOR ALL
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

-- 8. Create public Storage bucket 'specials'
INSERT INTO storage.buckets (id, name, public)
VALUES ('specials', 'specials', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 9. Clean up existing storage policies
DROP POLICY IF EXISTS "Public can view special images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload special images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update special images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete special images" ON storage.objects;
DROP POLICY IF EXISTS "Allow upload to specials" ON storage.objects;
DROP POLICY IF EXISTS "Allow update to specials" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete to specials" ON storage.objects;

-- 10. Storage Policies
-- Anyone can view images in the specials bucket
CREATE POLICY "Public can view special images"
ON storage.objects FOR SELECT
USING (bucket_id = 'specials');

-- Allow image upload to specials bucket
CREATE POLICY "Allow upload to specials"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'specials');

-- Allow image updates in specials bucket
CREATE POLICY "Allow update to specials"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'specials');

-- Allow image deletion in specials bucket
CREATE POLICY "Allow delete to specials"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'specials');
