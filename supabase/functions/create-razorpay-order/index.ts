// ==============================================================================
// YAARANA Cafe - Edge Function: create-razorpay-order
// Server-side generation of Razorpay Order using authoritative database balance
// ==============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

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

    const { orderId } = await req.json();
    if (!orderId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: orderId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create elevated server client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch authoritative order state
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, user_id, total_amount, paid_amount, payment_status, bill_version, payment_token, created_at')
      .eq('id', orderId)
      .maybeSingle();

    if (orderErr || !order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Authorization Verification
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
          // Check if admin
          const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();
          if (profile?.role === 'admin') {
            isAuthorized = true;
          }
        }
      }
    }

    // Fallback A: Verify guest cryptographic payment token
    if (!isAuthorized && orderPaymentToken && order.payment_token) {
      if (orderPaymentToken === order.payment_token) {
        isAuthorized = true;
      }
    }

    // Fallback B: If this order is currently Pending/Partially_Paid and was created within the last 60 minutes,
    // authorize payment creation (permits seamless guest dining checkout)
    if (!isAuthorized && (order.payment_status?.toLowerCase() === 'pending' || order.payment_status?.toLowerCase() === 'partially_paid')) {
      const createdAtMs = order.created_at ? new Date(order.created_at).getTime() : Date.now();
      if (Date.now() - createdAtMs < 60 * 60 * 1000) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid credentials or payment token' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Calculate remaining payable balance
    const totalAmount = Number(order.total_amount || 0);
    const paidAmount = Number(order.paid_amount || 0);
    const remainingBalance = parseFloat(Math.max(0, totalAmount - paidAmount).toFixed(2));

    if (remainingBalance <= 0 || order.payment_status === 'Paid') {
      return new Response(
        JSON.stringify({ error: 'This order is already fully paid', isFullyPaid: true }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const amountInPaise = Math.round(remainingBalance * 100);

    // 4. Create Order on Razorpay Gateway
    const credentials = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
    const receiptId = `yrn_${String(order.id).slice(-10)}_${Date.now().toString().slice(-4)}`;

    const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt: receiptId,
        notes: {
          order_id: String(order.id),
          bill_version: String(order.bill_version || 1),
        },
      }),
    });

    if (!rzpResponse.ok) {
      const errData = await rzpResponse.json();
      console.error('Razorpay Order API Error:', errData);
      return new Response(
        JSON.stringify({ error: errData.error?.description || 'Failed to create Razorpay order' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rzpOrder = await rzpResponse.json();

    // 5. Save generated Razorpay order ID to order record
    await supabase
      .from('orders')
      .update({ razorpay_order_id: rzpOrder.id })
      .eq('id', order.id);

    return new Response(
      JSON.stringify({
        success: true,
        razorpay_order_id: rzpOrder.id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        key_id: razorpayKeyId,
        bill_version: order.bill_version || 1,
        remaining_balance: remainingBalance,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Unhandled error in create-razorpay-order:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
