// ==============================================================================
// YAARANA Cafe - Edge Function: razorpay-webhook
// Raw-body cryptographic HMAC verification, duplicate event deduplication,
// and safe atomic reconciliation.
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

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') || '';

    if (!webhookSecret) {
      console.error('Server misconfiguration: RAZORPAY_WEBHOOK_SECRET not set');
      return new Response('Webhook secret missing on server', { status: 500 });
    }

    // 1. Read EXACT unparsed raw text stream for signature verification
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature') || '';

    if (!signature) {
      return new Response('Missing x-razorpay-signature header', { status: 400 });
    }

    // Cryptographic validation over raw body
    const expectedSignature = await computeHmacSha256(webhookSecret, rawBody);
    if (expectedSignature !== signature) {
      console.warn('Webhook signature verification failed!');
      return new Response('Invalid webhook signature', { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const eventId = event.id;
    const eventType = event.event;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Concurrency-Safe Deduplication Check
    const { data: insertedEvent, error: dedupErr } = await supabase
      .from('processed_webhook_events')
      .insert({ event_id: eventId, event_type: eventType })
      .select('event_id')
      .maybeSingle();

    if (dedupErr && dedupErr.code === '23505') {
      // Duplicate event (Postgres unique violation code 23505)
      console.log(`Duplicate webhook event ${eventId} discarded safely`);
      return new Response(JSON.stringify({ status: 'duplicate_event_ignored' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Process Event Types
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const payment = event.payload.payment?.entity;
      if (!payment) {
        return new Response('Missing payment entity', { status: 400 });
      }

      const rzpPaymentId = payment.id;
      const rzpOrderId = payment.order_id;
      const notesOrderId = payment.notes?.order_id;

      // Locate corresponding YAARANA order
      let targetOrder = null;
      if (notesOrderId) {
        const { data } = await supabase
          .from('orders')
          .select('id, bill_version, total_amount, paid_amount, payment_status')
          .eq('id', notesOrderId)
          .maybeSingle();
        targetOrder = data;
      }

      if (!targetOrder && rzpOrderId) {
        const { data } = await supabase
          .from('orders')
          .select('id, bill_version, total_amount, paid_amount, payment_status')
          .eq('razorpay_order_id', rzpOrderId)
          .maybeSingle();
        targetOrder = data;
      }

      if (targetOrder) {
        // Atomic settlement RPC
        await supabase.rpc('record_captured_payment', {
          p_order_id: String(targetOrder.id),
          p_razorpay_order_id: rzpOrderId || '',
          p_razorpay_payment_id: rzpPaymentId,
          p_amount_in_paise: payment.amount,
          p_bill_version: targetOrder.bill_version || 1,
        });
      }
    } else if (eventType === 'payment.failed') {
      const payment = event.payload.payment?.entity;
      if (payment) {
        const notesOrderId = payment.notes?.order_id;
        const rzpOrderId = payment.order_id;

        // Log failed attempt without altering terminal Paid / Partially_Paid status
        await supabase.from('payment_attempts').insert({
          order_id: notesOrderId || 'unknown',
          razorpay_order_id: rzpOrderId || 'unknown',
          razorpay_payment_id: payment.id,
          amount_in_paise: payment.amount || 0,
          currency: payment.currency || 'INR',
          bill_version: 1,
          status: 'failed',
          error_message: payment.error_description || payment.error_reason || 'Payment failed at bank',
        });
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Webhook execution error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
