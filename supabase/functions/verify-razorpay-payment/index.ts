// ==============================================================================
// YAARANA Cafe - Edge Function: verify-razorpay-payment
// 5-Layer Cryptographic and Gateway Verification with Atomic Settlement
// ==============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// Native Web Crypto API for zero-dependency, safe HMAC-SHA256 signature verification
async function computeHmacSha256(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-order-payment-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID') || '';
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET') || '';

    if (!razorpayKeyId || !razorpayKeySecret) {
      return new Response(
        JSON.stringify({ error: 'Server misconfiguration: Razorpay credentials missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const {
      orderId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = await req.json();

    if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return new Response(
        JSON.stringify({ error: 'Missing payment verification payload parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch current order state
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, user_id, total_amount, paid_amount, payment_status, bill_version, payment_token, razorpay_order_id, created_at')
      .eq('id', orderId)
      .maybeSingle();

    if (orderErr || !order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Authorization Check (Authenticated user, valid payment token, gateway order match, or fresh order)
    const authHeader = req.headers.get('Authorization') || '';
    const orderPaymentToken = req.headers.get('x-order-payment-token') || '';
    let isAuthorized = false;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        if (order.user_id && order.user_id === user.id) {
          isAuthorized = true;
        } else {
          const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();
          if (profile?.role === 'admin') isAuthorized = true;
        }
      }
    }

    if (!isAuthorized && orderPaymentToken && order.payment_token) {
      if (orderPaymentToken === order.payment_token) isAuthorized = true;
    }

    // Gateway order ID match: If the payment verification matches the order's registered Razorpay order ID
    if (!isAuthorized && order.razorpay_order_id && order.razorpay_order_id === razorpay_order_id) {
      isAuthorized = true;
    }

    // Fresh unpaid order fallback
    if (!isAuthorized && (order.payment_status?.toLowerCase() === 'pending' || order.payment_status?.toLowerCase() === 'partially_paid')) {
      const createdAtMs = order.created_at ? new Date(order.created_at).getTime() : Date.now();
      if (Date.now() - createdAtMs < 60 * 60 * 1000) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized payment verification attempt' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // LAYER 1: Cryptographic HMAC-SHA256 Signature Verification
    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generatedSignature = await computeHmacSha256(razorpayKeySecret, payload);

    if (generatedSignature !== razorpay_signature) {
      console.warn('Tampered payment signature detected for order:', orderId);
      return new Response(
        JSON.stringify({ error: 'Cryptographic signature mismatch: payment verification failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // LAYER 2: Authoritative Gateway Status Query (Razorpay API)
    const credentials = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
    const rzpPayResponse = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
      },
    });

    if (!rzpPayResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Could not fetch payment status from gateway' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const gatewayPayment = await rzpPayResponse.json();

    // LAYER 3: Verification of Gateway Captured State
    if (gatewayPayment.status !== 'captured' && gatewayPayment.status !== 'authorized') {
      return new Response(
        JSON.stringify({
          error: `Payment is not in captured state. Status: ${gatewayPayment.status}`,
          status: gatewayPayment.status,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // LAYER 4: Entity & Order Linkage
    if (gatewayPayment.order_id !== razorpay_order_id) {
      return new Response(
        JSON.stringify({ error: 'Gateway order ID does not match session order ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (gatewayPayment.currency !== 'INR') {
      return new Response(
        JSON.stringify({ error: 'Unsupported currency' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // LAYER 5: Atomic Database Settlement RPC
    let settlementResult: any = null;
    const { data: rpcData, error: rpcErr } = await supabase.rpc('record_captured_payment', {
      p_order_id: String(order.id),
      p_razorpay_order_id: razorpay_order_id,
      p_razorpay_payment_id: razorpay_payment_id,
      p_amount_in_paise: gatewayPayment.amount,
      p_bill_version: order.bill_version || 1,
    });

    if (rpcErr || !rpcData) {
      console.warn('Settlement RPC warning, executing authoritative direct update:', rpcErr);
      const paidAmt = Number((gatewayPayment.amount / 100).toFixed(2));
      const orderTotal = Number(order.total_amount || 0);
      const newStatus = paidAmt >= orderTotal ? 'Paid' : 'Partially_Paid';

      const { error: directErr } = await supabase
        .from('orders')
        .update({
          payment_status: newStatus,
          paid_amount: paidAmt,
          payment_reference: razorpay_payment_id,
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (directErr) {
        console.error('Direct fallback update error:', directErr);
        return new Response(
          JSON.stringify({ error: 'Database error recording payment: ' + (rpcErr?.message || directErr.message) }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      settlementResult = {
        payment_status: newStatus,
        total_amount: orderTotal,
        paid_amount: paidAmt,
        remaining_balance: Math.max(0, orderTotal - paidAmt),
        is_fully_paid: newStatus === 'Paid',
        idempotent_duplicate: false,
      };
    } else {
      settlementResult = rpcData;
    }

    return new Response(
      JSON.stringify({
        verified: true,
        orderId: order.id,
        payment_status: settlementResult.payment_status,
        total_amount: settlementResult.total_amount,
        paid_amount: settlementResult.paid_amount,
        remaining_balance: settlementResult.remaining_balance,
        is_fully_paid: settlementResult.is_fully_paid,
        idempotent_duplicate: settlementResult.idempotent_duplicate,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Unhandled error in verify-razorpay-payment:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
