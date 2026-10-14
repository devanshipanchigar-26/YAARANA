import React, { useState, useEffect, useRef } from 'react';
import { X, Trash2, ShoppingCart, ArrowLeft, CheckCircle2, Lock, AlertCircle, Receipt, ExternalLink } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useCafeSettings, checkStoreOpenStatus } from '../utils/cafeSettings';
import OrderBillModal from '../Components/OrderBillModal';
import './Cart.css';

const PICKUP_OPTIONS = ['ASAP', 'In 15 minutes', 'In 30 minutes', 'In 45 minutes', 'In 1 hour'];
const getSavedCustomerKey = (userId) => (userId ? `yaarana_customer_${userId}` : 'yaarana_customer_guest');

// Name and phone are remembered per user or guest on this device
const loadSavedCustomer = (userId) => {
  try {
    return JSON.parse(localStorage.getItem(getSavedCustomerKey(userId))) || {};
  } catch {
    return {};
  }
};

export default function Cart({
  isOpen,
  onClose,
  items = [],
  increaseQuantity,
  decreaseQuantity,
  removeItem,
  clearCart,
  onExplore,
  defaultTable = '',
  initialStep = 'cart',
  onRequireLogin,
  onTrackOrder,
}) {
  const { user, profile } = useAuth();
  const [cafeSettings] = useCafeSettings();
  const storeStatus = checkStoreOpenStatus(cafeSettings);
  const acceptingOrders = storeStatus.isOpen;
  const minOrderAmount = Number(cafeSettings?.minOrderAmount) || 0;
  const cashEnabled = cafeSettings?.cashPaymentEnabled !== false;
  const upiEnabled = cafeSettings?.upiPaymentEnabled !== false;

  // 'cart' -> 'checkout' -> 'success'
  const [step, setStep] = useState(initialStep);

  const [customerName, setCustomerName] = useState(() => loadSavedCustomer().name || '');
  const [customerPhone, setCustomerPhone] = useState(() => loadSavedCustomer().phone || '');
  const [orderType, setOrderType] = useState(defaultTable ? 'dine-in' : 'dine-in');
  const [tableNo, setTableNo] = useState(defaultTable);
  const [pickupTime, setPickupTime] = useState(PICKUP_OPTIONS[0]);
  const [paymentMode, setPaymentMode] = useState(cashEnabled ? 'cash' : 'upi');

  const [placing, setPlacing] = useState(false);
  const submittingRef = useRef(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [isBillOpen, setIsBillOpen] = useState(false);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal;
  const isMinOrderMet = subtotal >= minOrderAmount;

  // Sync payment mode if active method is disabled
  useEffect(() => {
    if (!cashEnabled && upiEnabled && paymentMode === 'cash') {
      setPaymentMode('upi');
    } else if (!upiEnabled && cashEnabled && paymentMode === 'upi') {
      setPaymentMode('cash');
    }
  }, [cashEnabled, upiEnabled, paymentMode]);

  // Sync step if initialStep changes externally
  useEffect(() => {
    if (initialStep) {
      setStep(initialStep);
    }
  }, [initialStep]);

  // Auto-fill user profile details or load isolated saved customer details when user changes
  useEffect(() => {
    if (user) {
      if (profile?.name) {
        setCustomerName(profile.name);
      } else {
        const saved = loadSavedCustomer(user.id);
        setCustomerName(saved.name || '');
      }
      if (profile?.phone) {
        setCustomerPhone(profile.phone);
      } else {
        const saved = loadSavedCustomer(user.id);
        setCustomerPhone(saved.phone || '');
      }
    } else {
      // Guest mode
      const saved = loadSavedCustomer(null);
      setCustomerName(saved.name || '');
      setCustomerPhone(saved.phone || '');
    }
  }, [user, profile]);

  // Table number from the QR link
  useEffect(() => {
    if (defaultTable) setTableNo(defaultTable);
  }, [defaultTable]);

  // If the cart empties while checking out, go back to the cart
  useEffect(() => {
    if (step === 'checkout' && items.length === 0) setStep('cart');
  }, [items.length, step]);

  // After closing on the success screen, reset for the next order
  useEffect(() => {
    if (!isOpen && step === 'success') {
      const timer = setTimeout(() => {
        setStep('cart');
        setResult(null);
      }, 450);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOpen, step]);

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (submittingRef.current || placing) return;

    if (!acceptingOrders) {
      setError(storeStatus.message);
      return;
    }
    if (!isMinOrderMet) {
      setError(`Minimum order amount is ₹${minOrderAmount}.`);
      return;
    }
    if (items.length === 0) {
      setError('Your cart is empty.');
      return;
    }
    if (orderType === 'dine-in' && !tableNo.trim()) {
      setError('Please provide your table number for Dine In.');
      return;
    }
    if (!customerPhone.trim()) {
      setError('Please enter your phone number.');
      return;
    }

    submittingRef.current = true;
    setPlacing(true);
    setError('');

    // Snapshot for local display and bill preview
    const snapshotItems = items.map((item) => ({
      id: item.id,
      name: item.name,
      item_name: item.name,
      price: item.price,
      unit_price: item.price,
      quantity: item.quantity,
    }));

    // Exact payload format expected by PostgreSQL place_order RPC
    const rpcItemsPayload = items.map((item) => ({
      menu_item_id: item.id,
      quantity: item.quantity,
    }));

    const { data, error: rpcError } = await supabase.rpc('place_order', {
      p_customer_name: customerName.trim(),
      p_customer_phone: customerPhone.trim(),
      p_order_type: orderType,
      p_table_no: orderType === 'dine-in' ? (tableNo.trim() || 'Table 1') : 'Takeaway',
      p_pickup_time: orderType === 'takeaway' ? pickupTime : null,
      p_payment_mode: paymentMode,
      p_items: rpcItemsPayload,
    });

    if (rpcError) {
      console.error('Error placing order:', rpcError.message);
      setError(rpcError.message);
      setPlacing(false);
      submittingRef.current = false;
      return;
    }

    const createdOrderId = data?.order_id || data?.id;

    // Associate order with logged-in user if available
    if (user?.id && createdOrderId) {
      try {
        await supabase
          .from('orders')
          .update({ user_id: user.id })
          .eq('id', createdOrderId);
      } catch {
        // Best-effort linking in case user_id column or RLS policy restricts update
      }
    }

    try {
      localStorage.setItem(
        getSavedCustomerKey(user?.id),
        JSON.stringify({ name: customerName.trim(), phone: customerPhone.trim() })
      );
      if (createdOrderId) {
        localStorage.setItem('yaarana_last_order_id', String(createdOrderId));
      }
    } catch {
      /* ignore */
    }

    setResult({
      orderId: createdOrderId,
      order_number: data?.order_number || `#YRN-${createdOrderId}`,
      total: Number(data?.total || total),
      total_amount: Number(data?.total || total),
      orderType,
      order_type: orderType,
      tableNo,
      table_no: tableNo,
      pickupTime,
      pickup_time: pickupTime,
      paymentMode,
      payment_mode: paymentMode,
      payment_status: 'Pending',
      order_status: 'Pending',
      customer_name: customerName,
      customer_phone: customerPhone,
      created_at: new Date().toISOString(),
      order_items: snapshotItems,
    });

    clearCart();
    setStep('success');
    setPlacing(false);
    submittingRef.current = false;
  };

  const handleProceedToCheckout = () => {
    if (!acceptingOrders) {
      setError(storeStatus.message);
      return;
    }
    if (!isMinOrderMet) {
      return;
    }
    if (!user) {
      if (onRequireLogin) {
        onRequireLogin();
      }
      return;
    }
    setStep('checkout');
  };

  const headerTitle =
    step === 'checkout' ? 'Checkout' : step === 'success' ? 'Order placed' : 'Your Cart';

  return (
    <>
      {/* Dark background overlay */}
      <div
        className={`cart-overlay ${isOpen ? 'show-overlay' : ''}`}
        onClick={onClose}
      ></div>

      {/* CART SIDEBAR */}
      <aside className={`cart-sidebar ${isOpen ? 'cart-open' : ''}`}>
        {/* HEADER */}
        <div className="cart-header">
          <div>
            <span className="cart-mini-title">YAARANA</span>
            <h2>
              {headerTitle}
              {step === 'cart' && totalItems > 0 && (
                <span className="cart-count">{totalItems}</span>
              )}
            </h2>
          </div>

          <button className="cart-close" onClick={onClose} aria-label="Close cart">
            <X size={20} />
          </button>
        </div>

        {/* Cafe Paused / Closed Notice */}
        {!acceptingOrders && (
          <div className="cart-alert-notice paused">
            <AlertCircle size={16} />
            <span>{storeStatus.message}</span>
          </div>
        )}

        {/* STEP 1: CART */}
        {step === 'cart' && (
          <>
            <div className="cart-items">
              {items.length === 0 ? (
                <div className="empty-cart">
                  <div className="empty-cart-icon">
                    <ShoppingCart size={38} strokeWidth={1.6} />
                  </div>
                  <h3>Your cart is empty</h3>
                  <p>Looks like your Yaar needs a little more food!</p>
                  <button type="button" onClick={onExplore || onClose}>
                    Explore Menu
                  </button>
                </div>
              ) : (
                items.map((item) => (
                  <div className="cart-item" key={item.id}>
                    <div className="item-image">
                      {item.emoji || item.name.charAt(0)}
                    </div>

                    <div className="item-details">
                      <h3>{item.name}</h3>
                      <p className="item-price">₹{item.price * item.quantity}</p>
                    </div>

                    <div className="item-actions">
                      <div className="quantity-control">
                        <button
                          type="button"
                          onClick={() => decreaseQuantity(item.id)}
                          aria-label={`Decrease ${item.name}`}
                        >
                          −
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => increaseQuantity(item.id)}
                          aria-label={`Increase ${item.name}`}
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        className="remove-btn"
                        onClick={() => removeItem(item.id)}
                        title="Remove item"
                        aria-label={`Remove ${item.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="cart-bottom">
                {!isMinOrderMet && (
                  <div className="cart-alert-notice min-order">
                    <span>
                      Minimum order amount is ₹{minOrderAmount}. Add ₹{minOrderAmount - subtotal} more to checkout.
                    </span>
                  </div>
                )}

                <div className="bill-row total-row">
                  <span>Total</span>
                  <strong>₹{total}</strong>
                </div>

                <button
                  type="button"
                  className="checkout-button"
                  onClick={handleProceedToCheckout}
                  disabled={!acceptingOrders || !isMinOrderMet}
                >
                  {!acceptingOrders
                    ? storeStatus.status === 'outside_hours' || storeStatus.status === 'weekly_closed'
                      ? 'Store Closed'
                      : 'Ordering Paused'
                    : !isMinOrderMet
                    ? `Min Order: ₹${minOrderAmount}`
                    : 'Proceed to Checkout'}
                  <span>→</span>
                </button>
              </div>
            )}
          </>
        )}

        {/* STEP 2: CHECKOUT */}
        {step === 'checkout' && (
          <form className="checkout-form" onSubmit={handlePlaceOrder}>
            <div className="checkout-scroll">
              <button type="button" className="checkout-back" onClick={() => setStep('cart')}>
                <ArrowLeft size={16} /> Back to cart
              </button>

              {/* Order summary */}
              <div className="checkout-summary">
                {items.map((item) => (
                  <div className="summary-line" key={item.id}>
                    <span>
                      {item.quantity} × {item.name}
                    </span>
                    <strong>₹{item.price * item.quantity}</strong>
                  </div>
                ))}
                <div className="summary-line summary-total">
                  <span>Total</span>
                  <strong>₹{total}</strong>
                </div>
              </div>

              {cafeSettings?.estimatedPrepTime && (
                <div className="prep-time-indicator">
                  ⏱️ Estimated prep time: <strong>{cafeSettings.estimatedPrepTime}</strong>
                </div>
              )}

              {/* Dine in or takeaway */}
              <span className="cf-label">How would you like your order?</span>
              <div className="cf-segment" role="group" aria-label="Order type">
                <button
                  type="button"
                  className={orderType === 'dine-in' ? 'active' : ''}
                  aria-pressed={orderType === 'dine-in'}
                  onClick={() => setOrderType('dine-in')}
                >
                  Dine in
                </button>
                <button
                  type="button"
                  className={orderType === 'takeaway' ? 'active' : ''}
                  aria-pressed={orderType === 'takeaway'}
                  onClick={() => setOrderType('takeaway')}
                >
                  Takeaway
                </button>
              </div>

              {orderType === 'dine-in' ? (
                <div className="cf-field">
                  <label className="cf-label" htmlFor="cf-table">Table number</label>
                  <input
                    id="cf-table"
                    className="cf-input"
                    type="text"
                    inputMode="numeric"
                    value={tableNo}
                    onChange={(e) => setTableNo(e.target.value)}
                    placeholder="e.g. 5"
                    required
                  />
                </div>
              ) : (
                <div className="cf-field">
                  <label className="cf-label" htmlFor="cf-pickup">Pickup time</label>
                  <select
                    id="cf-pickup"
                    className="cf-input"
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                  >
                    {PICKUP_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="cf-field">
                <label className="cf-label" htmlFor="cf-name">Your name</label>
                <input
                  id="cf-name"
                  className="cf-input"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                />
              </div>

              <div className="cf-field">
                <label className="cf-label" htmlFor="cf-phone">Phone number</label>
                <input
                  id="cf-phone"
                  className="cf-input"
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  pattern="[0-9+ ]{10,15}"
                  title="Enter a valid phone number"
                  required
                />
              </div>

              <span className="cf-label">Select Payment Method</span>
              <div className="cf-segment" role="group" aria-label="Payment mode">
                {cashEnabled && (
                  <button
                    type="button"
                    className={paymentMode === 'cash' ? 'active' : ''}
                    aria-pressed={paymentMode === 'cash'}
                    onClick={() => setPaymentMode('cash')}
                  >
                    💵 Cash at counter
                  </button>
                )}
                {upiEnabled && (
                  <button
                    type="button"
                    className={paymentMode === 'upi' ? 'active' : ''}
                    aria-pressed={paymentMode === 'upi'}
                    onClick={() => setPaymentMode('upi')}
                  >
                    📱 UPI at counter
                  </button>
                )}
              </div>

              <div className="payment-selected-hint">
                {paymentMode === 'cash' ? (
                  <span>💵 <strong>Cash selected:</strong> Pay physically at the cafe counter.</span>
                ) : (
                  <span>📱 <strong>UPI selected:</strong> Scan & pay using UPI at the counter or tracker.</span>
                )}
              </div>

              {paymentMode === 'upi' && cafeSettings?.upiId && (
                <div className="upi-vpa-pill">
                  Cafe UPI VPA: <strong>{cafeSettings.upiId}</strong>
                </div>
              )}

              {error && <p className="cf-error">{error}</p>}
            </div>

            <div className="cart-bottom">
              <button
                type="submit"
                className="checkout-button"
                disabled={placing || !acceptingOrders}
              >
                {!acceptingOrders
                  ? storeStatus.status === 'outside_hours' || storeStatus.status === 'weekly_closed'
                    ? 'Store Closed'
                    : 'Ordering Paused'
                  : placing
                  ? 'Placing order...'
                  : `Place order (${paymentMode === 'cash' ? 'Cash' : 'UPI'}) · ₹${total}`}
                <span>→</span>
              </button>
              <p className="secure-text">
                <Lock size={11} style={{ verticalAlign: '-1px' }} /> Verified counter payment • You pay when you collect
              </p>
            </div>
          </form>
        )}

        {/* STEP 3: SUCCESS */}
        {step === 'success' && result && (
          <div className="cart-success">
            <CheckCircle2 size={64} strokeWidth={1.6} className="success-icon" />
            <h3>Thank you, {customerName}!</h3>
            <p className="success-id">{result.order_number || `Order #${result.orderId}`}</p>
            <p>
              {result.orderType === 'dine-in'
                ? `We'll bring your order to table ${result.tableNo}.`
                : `Your order will be ready for pickup: ${(result.pickupTime || 'asap').toLowerCase()}.`}
            </p>
            <p className="success-total">Total to pay: ₹{result.total}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px', width: '100%' }}>
              <button
                type="button"
                className="checkout-button"
                style={{ backgroundColor: '#311E18', color: '#FFD000' }}
                onClick={() => {
                  onClose();
                  if (onTrackOrder) {
                    onTrackOrder(result.orderId);
                  }
                }}
              >
                <ExternalLink size={16} style={{ marginRight: '6px', verticalAlign: '-2px' }} />
                Track Live Order
              </button>

              <button
                type="button"
                className="checkout-button"
                style={{ backgroundColor: '#F4EDE5', color: '#311E18', border: '1px solid #EFE9E1' }}
                onClick={() => setIsBillOpen(true)}
              >
                <Receipt size={16} style={{ marginRight: '6px', verticalAlign: '-2px' }} />
                View Bill / Receipt
              </button>

              <button type="button" className="checkout-button" onClick={onExplore || onClose}>
                Back to menu
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Bill Modal */}
      {result && (
        <OrderBillModal
          isOpen={isBillOpen}
          onClose={() => setIsBillOpen(false)}
          order={result}
        />
      )}
    </>
  );
}