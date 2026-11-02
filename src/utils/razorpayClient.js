// ==============================================================================
// YAARANA Cafe - Razorpay Client Utility
// Manages Razorpay Checkout SDK injection, order creation & verification handshakes
// ==============================================================================

import { supabase } from '../supabaseClient';

const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

/**
 * Dynamically loads the official Razorpay Checkout SDK if not already present in the DOM
 */
export function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('Failed to load Razorpay SDK');
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

/**
 * Securely launches the Razorpay Standard Checkout modal for a given YAARANA order.
 * 
 * @param {Object} options
 * @param {string|number} options.orderId - The YAARANA database order ID
 * @param {string} [options.customerName] - Pre-filled customer name
 * @param {string} [options.customerPhone] - Pre-filled customer phone
 * @param {string} [options.customerEmail] - Pre-filled customer email
 * @param {string} [options.paymentToken] - Cryptographic token for guest / table orders
 * @param {Function} options.onSuccess - Callback on verified server settlement
 * @param {Function} options.onDismiss - Callback when user closes modal without paying
 * @param {Function} options.onError - Callback on error or failure
 */
export async function openRazorpayCheckout({
  orderId,
  customerName = '',
  customerPhone = '',
  customerEmail = '',
  paymentToken = '',
  onSuccess = () => {},
  onDismiss = () => {},
  onError = () => {},
}) {
  try {
    // 1. Ensure SDK script is loaded
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      throw new Error('Could not connect to payment gateway. Please check your internet connection.');
    }

    // 2. Request server-side Razorpay order creation using authoritative balance
    const headers = {};
    if (paymentToken) {
      headers['x-order-payment-token'] = paymentToken;
    }

    const { data: orderData, error: orderErr } = await supabase.functions.invoke('create-razorpay-order', {
      body: { orderId },
      headers,
    });

async function extractErrorMessage(err, fallback = 'Operation failed') {
  if (!err) return fallback;
  try {
    if (err.context) {
      if (typeof err.context.clone === 'function') {
        try {
          const body = await err.context.clone().json();
          if (body?.error || body?.message) return body.error || body.message;
        } catch {}
      }
      if (typeof err.context.json === 'function') {
        try {
          const body = await err.context.json();
          if (body?.error || body?.message) return body.error || body.message;
        } catch {}
      }
      if (typeof err.context.text === 'function') {
        try {
          const txt = await err.context.text();
          if (txt) {
            try {
              const parsed = JSON.parse(txt);
              if (parsed?.error || parsed?.message) return parsed.error || parsed.message;
            } catch {
              return txt;
            }
          }
        } catch {}
      }
    }
  } catch {}
  return err.message || fallback;
}

    if (orderErr || !orderData || !orderData.razorpay_order_id) {
      const detailedMsg = await extractErrorMessage(orderErr, orderData?.error || 'Could not initiate online payment order');
      throw new Error(detailedMsg);
    }

    // 3. Configure Razorpay Standard Checkout Modal
    const logoUrl = (typeof window !== 'undefined' && window.location?.origin)
      ? `${window.location.origin}/favicon.svg`
      : undefined;

    const rzpOptions = {
      key: orderData.key_id,
      amount: orderData.amount,
      currency: orderData.currency || 'INR',
      name: 'YAARANA Café',
      description: `Payment for Order #${orderId}`,
      image: logoUrl,
      order_id: orderData.razorpay_order_id,
      prefill: {
        name: customerName,
        contact: customerPhone,
        email: customerEmail,
      },
      theme: {
        color: '#311E18', // YAARANA brand signature dark roast
      },
      modal: {
        ondismiss: () => {
          onDismiss();
        },
      },
      handler: async (response) => {
        try {
          // Strictly server-side cryptographic and gateway verification
          // The client never directly mutates order payment status in the database
          const { data: verifyData, error: verifyErr } = await supabase.functions.invoke(
            'verify-razorpay-payment',
            {
              body: {
                orderId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
              headers,
            }
          );

          if (verifyErr || !verifyData?.verified) {
            const detailedMsg = await extractErrorMessage(verifyErr, verifyData?.error || 'Payment verification failed');
            const isNetworkErr = !verifyData && (
              verifyErr?.message?.toLowerCase().includes('fetch') ||
              verifyErr?.message?.toLowerCase().includes('network') ||
              verifyErr?.context?.status >= 500
            );

            if (isNetworkErr) {
              // Network timeout after gateway authorization: Do NOT treat as failure or success without reconciliation
              onError({
                isNetworkError: true,
                isPendingReconciliation: true,
                message: 'Your payment was authorized by your bank, but our server timed out while receiving final confirmation. Please DO NOT pay again. Your order will be automatically verified shortly via webhook.',
                paymentId: response.razorpay_payment_id,
                orderId,
              });
              return;
            }

            // Definite rejection (signature mismatch, uncaptured state, entity mismatch)
            onError(new Error(detailedMsg || 'Payment verification was rejected by server.'));
            return;
          }

          // Verified and captured on server
          onSuccess(verifyData);
        } catch (vErr) {
          console.error('Error during payment verification request:', vErr);
          onError({
            isNetworkError: true,
            isPendingReconciliation: true,
            message: 'Your payment was authorized by your bank, but a network error occurred during confirmation. Please do not retry immediately; the payment will reconcile automatically.',
            paymentId: response.razorpay_payment_id,
            orderId,
          });
        }
      },
    };

    const rzp = new window.Razorpay(rzpOptions);
    rzp.on('payment.failed', (failResponse) => {
      console.warn('Razorpay payment failed at gateway:', failResponse.error);
      onError(new Error(failResponse.error?.description || 'Payment was declined at the bank'));
    });

    rzp.open();
  } catch (err) {
    console.error('Razorpay checkout initialization error:', err);
    onError(err);
  }
}

/**
 * Safe inspection of Razorpay integration mode (test vs live) without exposing secrets
 */
export async function checkRazorpayConfig() {
  try {
    const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
      body: { action: 'get-config' },
    });
    if (error || !data) return { configured: false, mode: 'unknown', is_live_mode: false };
    return data;
  } catch {
    return { configured: false, mode: 'unknown', is_live_mode: false };
  }
}
