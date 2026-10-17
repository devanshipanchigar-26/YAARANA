-- ==============================================================================
-- YAARANA Cafe: Hardened Razorpay Payment Ledger & Concurrency Migration
-- ==============================================================================

-- 1. Safely add ledger tracking, concurrency versioning, and payment tokens to orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS bill_version INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS payment_token UUID NOT NULL DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS payment_reference TEXT,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order_id ON public.orders(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_token ON public.orders(payment_token);

-- 2. Normalize existing orders rows before applying constraints
-- (Fixes PostgreSQL error 23514 caused by lowercase 'pending'/'paid' or NULL in legacy rows)
UPDATE public.orders 
SET payment_status = CASE 
  WHEN lower(trim(COALESCE(payment_status, ''))) = 'paid' THEN 'Paid'
  WHEN lower(trim(COALESCE(payment_status, ''))) IN ('partially_paid', 'partial') THEN 'Partially_Paid'
  WHEN lower(trim(COALESCE(payment_status, ''))) = 'failed' THEN 'Failed'
  ELSE 'Pending'
END;

-- Backfill paid_amount for already settled legacy orders
UPDATE public.orders
SET paid_amount = total_amount
WHERE (payment_status = 'Paid' OR lower(trim(payment_status)) = 'paid')
  AND (paid_amount IS NULL OR paid_amount = 0);

-- Safely drop old constraint if present and apply case-tolerant constraint
DO $$ 
BEGIN
  ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
  ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS payment_status_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.orders 
ADD CONSTRAINT orders_payment_status_check 
CHECK (lower(trim(payment_status)) IN ('pending', 'partially_paid', 'paid', 'failed'));

-- 3. Webhook Deduplication Table (Private internal ledger)
CREATE TABLE IF NOT EXISTS public.processed_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Payment Attempts Audit Table
CREATE TABLE IF NOT EXISTS public.payment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL,
  razorpay_order_id TEXT NOT NULL,
  razorpay_payment_id TEXT UNIQUE,
  amount_in_paise INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  bill_version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'initiated', -- 'initiated', 'captured', 'failed', 'amount_mismatch'
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_order_id ON public.payment_attempts(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_razorpay_order_id ON public.payment_attempts(razorpay_order_id);

-- 5. Enable Row Level Security (RLS) on new tables
ALTER TABLE public.processed_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;

-- 6. Lock down permissions: Zero public/anon access to internal payment ledgers
REVOKE ALL ON public.processed_webhook_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.processed_webhook_events TO service_role, postgres;

REVOKE ALL ON public.payment_attempts FROM PUBLIC, anon;
GRANT SELECT ON public.payment_attempts TO authenticated;
GRANT ALL ON public.payment_attempts TO service_role, postgres;

-- Only authenticated administrators can inspect payment attempts
DROP POLICY IF EXISTS "Admins can view payment attempts" ON public.payment_attempts;
CREATE POLICY "Admins can view payment attempts"
ON public.payment_attempts FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

-- 7. Atomic Concurrency-Safe Settlement Procedure
CREATE OR REPLACE FUNCTION public.record_captured_payment(
  p_order_id TEXT,
  p_razorpay_order_id TEXT,
  p_razorpay_payment_id TEXT,
  p_amount_in_paise INTEGER,
  p_bill_version INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order RECORD;
  v_new_paid NUMERIC(10, 2);
  v_payment_amount NUMERIC(10, 2);
  v_new_status TEXT;
  v_attempt_id UUID;
BEGIN
  -- 1. ATOMIC INVERTED DEDUPLICATION:
  -- Attempt to register the payment ID first. The UNIQUE constraint acts as an atomic lock.
  INSERT INTO public.payment_attempts (
    order_id,
    razorpay_order_id,
    razorpay_payment_id,
    amount_in_paise,
    currency,
    bill_version,
    status
  ) VALUES (
    p_order_id,
    p_razorpay_order_id,
    p_razorpay_payment_id,
    p_amount_in_paise,
    'INR',
    p_bill_version,
    'captured'
  )
  ON CONFLICT (razorpay_payment_id) DO NOTHING
  RETURNING id INTO v_attempt_id;

  -- If no row was inserted, this exact payment_id was already captured by a concurrent request
  IF v_attempt_id IS NULL THEN
    SELECT * INTO v_order FROM public.orders WHERE id::text = p_order_id;
    RETURN jsonb_build_object(
      'success', true,
      'idempotent_duplicate', true,
      'payment_status', v_order.payment_status,
      'total_amount', v_order.total_amount,
      'paid_amount', v_order.paid_amount,
      'is_fully_paid', (lower(v_order.payment_status) = 'paid')
    );
  END IF;

  -- 2. ACQUIRE PESSIMISTIC ROW-LOCK ON ORDERS TABLE
  SELECT * INTO v_order 
  FROM public.orders 
  WHERE id::text = p_order_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found with ID %', p_order_id;
  END IF;

  -- 3. CALCULATE INCREMENTAL AMOUNT & NEW LEDGER BALANCE
  v_payment_amount := ROUND((p_amount_in_paise / 100.0)::numeric, 2);
  v_new_paid := COALESCE(v_order.paid_amount, 0.00) + v_payment_amount;

  -- 4. DETERMINE SETTLEMENT STATUS
  IF v_new_paid >= v_order.total_amount THEN
    v_new_status := 'Paid';
  ELSE
    v_new_status := 'Partially_Paid';
  END IF;

  -- 5. UPDATE ORDER ROW ATOMICALLY
  UPDATE public.orders 
  SET 
    paid_amount = v_new_paid,
    payment_status = v_new_status,
    payment_reference = CASE 
      WHEN payment_reference IS NULL OR payment_reference = '' THEN p_razorpay_payment_id
      WHEN position(p_razorpay_payment_id IN payment_reference) > 0 THEN payment_reference
      ELSE payment_reference || ', ' || p_razorpay_payment_id
    END,
    paid_at = NOW(),
    updated_at = NOW()
  WHERE id::text = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'idempotent_duplicate', false,
    'payment_status', v_new_status,
    'total_amount', v_order.total_amount,
    'paid_amount', v_new_paid,
    'remaining_balance', GREATEST(0.00, v_order.total_amount - v_new_paid),
    'is_fully_paid', (v_new_status = 'Paid')
  );
END;
$$;

-- 8. Restrict RPC execution strictly to internal service_role and postgres
REVOKE ALL ON FUNCTION public.record_captured_payment(TEXT, TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_captured_payment(TEXT, TEXT, TEXT, INTEGER, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.record_captured_payment(TEXT, TEXT, TEXT, INTEGER, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.record_captured_payment(TEXT, TEXT, TEXT, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_captured_payment(TEXT, TEXT, TEXT, INTEGER, INTEGER) TO postgres;
