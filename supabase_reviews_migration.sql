-- ==============================================================================
-- YAARANA Cafe: Customer Reviews, Ratings & Photo Gallery Migration
-- Run this script in your Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. Create or update public.reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id TEXT,
  customer_name TEXT NOT NULL DEFAULT 'Valued Customer',
  rating INTEGER NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  is_featured_in_gallery BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all necessary columns exist if table was previously created
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS order_id TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS customer_name TEXT NOT NULL DEFAULT 'Valued Customer';
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS rating INTEGER NOT NULL DEFAULT 5;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS comment TEXT NOT NULL DEFAULT '';
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS is_featured_in_gallery BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_order_id ON public.reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON public.reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_gallery ON public.reviews(status, is_featured_in_gallery);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- 4. Clean up existing policies if re-running
DROP POLICY IF EXISTS "Public can view approved reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can view their own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can insert their own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can update their own pending reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admins have full access to reviews" ON public.reviews;

-- 5. RLS Policies for Customers
-- Public / Customers can view approved reviews
CREATE POLICY "Public can view approved reviews"
ON public.reviews FOR SELECT
USING (status = 'approved');

-- Authenticated customers can also view their own reviews (even if pending or rejected)
CREATE POLICY "Users can view their own reviews"
ON public.reviews FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Logged-in or guest customers can insert reviews
CREATE POLICY "Users can insert their own reviews"
ON public.reviews FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Customers can update their own reviews while still pending
CREATE POLICY "Users can update their own pending reviews"
ON public.reviews FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status = 'pending')
WITH CHECK (auth.uid() = user_id);

-- 6. RLS Policy for Admins: Full management (Approve, Reject, Toggle Gallery, Delete)
CREATE POLICY "Admins have full access to reviews"
ON public.reviews FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

-- 7. Supabase Storage: Create public bucket 'review-photos'
INSERT INTO storage.buckets (id, name, public)
VALUES ('review-photos', 'review-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 8. Storage Policies for 'review-photos' bucket
DROP POLICY IF EXISTS "Public read review photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload review photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow upload to review photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete review photos" ON storage.objects;

-- Anyone can view photos in review-photos bucket
CREATE POLICY "Public read review photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'review-photos');

-- Anyone (authenticated or guest) can upload review photos to review-photos bucket
CREATE POLICY "Allow upload to review photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'review-photos');

-- Admins can delete review photos
CREATE POLICY "Admins can delete review photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'review-photos' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);
