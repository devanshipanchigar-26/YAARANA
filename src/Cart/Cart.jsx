import React, { useState, useEffect, useRef } from 'react';
import { X, Trash2, ShoppingCart, ArrowLeft, CheckCircle2, Lock, AlertCircle, Receipt, ExternalLink } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useCafeSettings, checkStoreOpenStatus } from '../utils/cafeSettings';
import { fetchActiveTableOrder, addItemsToExistingOrder, normalizeTableNo, formatTableLabel } from '../utils/billingUtils';
import { openRazorpayCheckout } from '../utils/razorpayClient';
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
  const razorpayEnabled = cafeSettings?.razorpayPaymentEnabled !== false;

  // 'cart' -> 'checkout' -> 'success'
  const [step, setStep] = useState(initialStep);

  const [customerName, setCustomerName] = useState(() => {
    return (
      profile?.name ||
      user?.user_metadata?.name ||
      user?.user_metadata?.full_name ||
      loadSavedCustomer(user?.id).name ||
      ''
    );
  });
  const [customerPhone, setCustomerPhone] = useState(() => {
    return (
      profile?.phone ||
      user?.user_metadata?.phone ||
      user?.phone ||
      loadSavedCustomer(user?.id).phone ||
      ''
    );
  });
  const [orderType, setOrderType] = useState('dine-in');
  const [tableNo, setTableNo] = useState(() => {
    return defaultTable || localStorage.getItem('yaarana_last_table') || '';
  });
  const [pickupTime, setPickupTime] = useState(PICKUP_OPTIONS[0]);
  const [paymentMode, setPaymentMode] = useState(() => {
    if (cashEnabled) return 'cash';
    if (razorpayEnabled) return 'razorpay';
    if (upiEnabled) return 'upi';
    return 'cash';
  });

  // Active open order for the selected table (if one already exists, new items attach to it)
  const [activeTableOrder, setActiveTableOrder] = useState(null);
  const [checkingBill, setCheckingBill] = useState(false);

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
    if (paymentMode === 'cash' && !cashEnabled) {
      setPaymentMode(razorpayEnabled ? 'razorpay' : upiEnabled ? 'upi' : 'cash');
    } else if (paymentMode === 'razorpay' && !razorpayEnabled) {
      setPaymentMode(cashEnabled ? 'cash' : upiEnabled ? 'upi' : 'razorpay');
    } else if (paymentMode === 'upi' && !upiEnabled) {
      setPaymentMode(cashEnabled ? 'cash' : razorpayEnabled ? 'razorpay' : 'upi');
    }
  }, [cashEnabled, upiEnabled, razorpayEnabled, paymentMode]);

  // Sync step if initialStep changes externally
  useEffect(() => {
    if (initialStep) {
      setStep(initialStep);
    }
  }, [initialStep]);

  // Auto-fill user profile details or load isolated saved customer details when user changes
  useEffect(() => {
    if (user) {
      const bestName =
        profile?.name ||
        user?.user_metadata?.name ||
        user?.user_metadata?.full_name ||
        loadSavedCustomer(user.id).name;
      if (bestName) setCustomerName(bestName);

      const bestPhone =
        profile?.phone ||
        user?.user_metadata?.phone ||
        user?.phone ||
        loadSavedCustomer(user.id).phone;
      if (bestPhone) setCustomerPhone(bestPhone);
    } else {
      // Guest mode
      const saved = loadSavedCustomer(null);
      setCustomerName(saved.name || '');
      setCustomerPhone(saved.phone || '');
    }
  }, [user, profile]);

  // Check if selected dine-in table already has an active unpaid order
  useEffect(() => {
    let isCancelled = false;
    const checkTableOrder = async () => {
      if (orderType !== 'dine-in' || !tableNo.trim()) {
        setActiveTableOrder(null);
        return;
      }
      setCheckingBill(true);
      const openOrder = await fetchActiveTableOrder(tableNo);
      if (!isCancelled) {
        setActiveTableOrder(openOrder);
        setCheckingBill(false);
      }
    };
    checkTableOrder();
    return () => {
      isCancelled = true;
    };
  }, [orderType, tableNo, step, isOpen]);

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

    // If this is dine-in and an unpaid order already exists on this table:
    // ADD NEW ITEMS TO THE SAME BILL / ORDER (do not create a separate new order)
    if (orderType === 'dine-in' && tableNo.trim()) {
      const activeOrder = activeTableOrder || (await fetchActiveTableOrder(tableNo));
      if (activeOrder && activeOrder.id) {
        try {
          const { updatedTotal } = await addItemsToExistingOrder(activeOrder, snapshotItems);

          try {
            localStorage.setItem(
              getSavedCustomerKey(user?.id),
              JSON.stringify({ name: customerName.trim(), phone: customerPhone.trim() })
            );
            localStorage.setItem('yaarana_last_order_id', String(activeOrder.id));
            localStorage.setItem('yaarana_last_table', tableNo.trim());
            window.dispatchEvent(new Event('storage'));
          } catch {}

          const existingItemsNormalized = (activeOrder.order_items || []).map((it) => ({
            name: it.menu_items?.name || it.item_name || it.name || 'Item',
            item_name: it.menu_items?.name || it.item_name || it.name || 'Item',
            price: Number(it.unit_price || it.price || it.menu_items?.price || 0),
            unit_price: Number(it.unit_price || it.price || it.menu_items?.price || 0),
            quantity: Number(it.quantity || 1),
          }));
          const combinedItems = [...existingItemsNormalized, ...snapshotItems];

          const orderData = {
            orderId: activeOrder.id,
            id: activeOrder.id,
            user_id: user?.id || activeOrder.user_id || null,
            isAddedToExistingBill: true,
            order_number: activeOrder.order_number || `#YRN-${activeOrder.id}`,
            total: updatedTotal,
            total_amount: updatedTotal,
            orderType: 'dine-in',
            order_type: 'dine-in',
            tableNo,
            table_no: tableNo,
            pickupTime: activeOrder.pickup_time || 'Dine-In',
            pickup_time: activeOrder.pickup_time || 'Dine-In',
            paymentMode: activeOrder.payment_mode || paymentMode,
            payment_mode: activeOrder.payment_mode || paymentMode,
            payment_status: 'Pending',
            customerName: customerName.trim(),
            customerPhone: customerPhone.trim(),
            items: combinedItems,
            order_items: combinedItems,
            created_at: activeOrder.created_at,
          };

          try {
            localStorage.setItem('yaarana_last_order', JSON.stringify(orderData));
          } catch {}

          // For ongoing table dine-in meals, additional rounds simply increment the running table tab.
          // Customers pay the full consolidated bill when finished dining from Track Order / My Orders!
          clearCart();
          setResult(orderData);
          setStep('success');
          setPlacing(false);
          submittingRef.current = false;
          return;
        } catch (addErr) {
          console.error('Error adding items to existing bill:', addErr);
          setError(addErr.message || 'Could not add items to existing bill');
          setPlacing(false);
          submittingRef.current = false;
          return;
        }
      }
    }

    const { data, error: rpcError } = await supabase.rpc('place_order', {
      p_customer_name: customerName.trim(),
      p_customer_phone: customerPhone.trim(),
      p_order_type: orderType,
      p_table_no: orderType === 'dine-in' ? (tableNo.trim() || 'Table 1') : 'Takeaway',
      p_pickup_time: orderType === 'takeaway' ? pickupTime : 'ASAP',
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

    // Associate order with logged-in user and retrieve authoritative payment_token
    let orderPaymentToken = data?.payment_token || '';
    if (createdOrderId) {
      try {
        if (user?.id) {
          await supabase
            .from('orders')
            .update({ user_id: user.id })
            .eq('id', createdOrderId);
        }
        const { data: orderMeta } = await supabase
          .from('orders')
          .select('payment_token')
          .eq('id', createdOrderId)
          .maybeSingle();
        if (orderMeta?.payment_token) {
          orderPaymentToken = orderMeta.payment_token;
        }
      } catch (metaErr) {
        console.warn('Could not sync order user_id or payment_token:', metaErr);
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
      if (orderType === 'dine-in' && tableNo.trim()) {
        localStorage.setItem('yaarana_last_table', tableNo.trim());
      }
      window.dispatchEvent(new Event('storage'));
    } catch {
      /* ignore */
    }

    const orderData = {
      orderId: createdOrderId,
      id: createdOrderId,
      user_id: user?.id || null,
      order_number: data?.order_number || (String(createdOrderId).startsWith('#') ? createdOrderId : `#YRN-${createdOrderId}`),
      total: Number(data?.total || total),
      total_amount: Number(data?.total || total),
      orderType,
      order_type: orderType,
      tableNo,
      table_no: tableNo,
      pickupTime: orderType === 'takeaway' ? pickupTime : 'ASAP',
      pickup_time: orderType === 'takeaway' ? pickupTime : 'ASAP',
      paymentMode,
      payment_mode: paymentMode,
      payment_status: 'Pending',
      payment_token: orderPaymentToken,
      order_status: 'Pending',
      customer_name: customerName,
      customer_phone: customerPhone,
      created_at: new Date().toISOString(),
      order_items: snapshotItems,
    };

    try {
      localStorage.setItem('yaarana_last_order', JSON.stringify(orderData));
    } catch {
      /* ignore */
    }

    // Orders are sent straight to the kitchen without opening any payment gateway at checkout.
    // Customers settle their tab by clicking "Pay the Bill" in Track Order, My Orders, or the counter!
    setResult(orderData);
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

        {/* User Account Connectivity Status */}
        <div className={`cart-user-badge ${user ? 'connected' : 'guest'}`}>
          <span className={`cart-user-dot ${user ? 'active' : 'guest'}`} />
          <div className="cart-user-info">
            <span className="cart-user-state">{user ? 'CONNECTED ACCOUNT' : 'GUEST CART'}</span>
            <span className="cart-user-identifier">
              {user ? (
                <>
                  {profile?.name || user?.user_metadata?.name || user?.email?.split('@')[0]}
                  <span className="cart-user-email"> ({user?.email})</span>
                </>
              ) : (
                'Sign in at checkout to link order'
              )}
            </span>
          </div>
        </div>

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

              {/* Account Connection confirmation banner */}
              {user && (
                <div className="checkout-account-box">
                  <div className="cab-icon">
                    <CheckCircle2 size={16} />
                  </div>
                  <div className="cab-content">
                    <div className="cab-headline">
                      Ordering as <strong>{profile?.name || user?.user_metadata?.name || 'Customer'}</strong>
                    </div>
                    <div className="cab-subtext">
                      {user?.email} • Live updates will show in <strong>My Orders</strong>
                    </div>
                  </div>
                </div>
              )}

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

                  {activeTableOrder && (
                    <div className="active-bill-checkout-card">
                      <div className="abcc-top">
                        <span className="abcc-pill">OPEN BILL ATTACHED</span>
                        <span className="abcc-table">{formatTableLabel(activeTableOrder.table_no)}</span>
                      </div>
                      <div className="abcc-content">
                        <p className="abcc-text">
                          Current bill amount: <strong>₹{Number(activeTableOrder.total_amount || 0).toFixed(2)}</strong>.
                        </p>
                        <p className="abcc-subtext">
                          ✨ These items (+<strong>₹{total.toFixed(2)}</strong>) will be added directly into your <strong>same meal bill</strong> (New total: <strong>₹{(Number(activeTableOrder.total_amount || 0) + total).toFixed(2)}</strong>).
                        </p>
                      </div>
                    </div>
                  )}
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

              {orderType === 'dine-in' ? (
                <div className="active-bill-payment-note">
                  <div className="abpn-header">
                    <Receipt size={16} />
                    <strong>{activeTableOrder ? 'Running Meal Tab Active' : `Dine-In • Table ${tableNo || 'Table'}`}</strong>
                  </div>
                  <p className="abpn-text">
                    {activeTableOrder ? (
                      <>
                        These items will be sent straight to the kitchen and added to your <strong>{formatTableLabel(activeTableOrder.table_no)}</strong> bill.
                        You can click <strong>"Pay the Bill"</strong> from <strong>Track Order</strong> after having your meal, or pay at the counter.
                      </>
                    ) : (
                      <>
                        Your order will be sent directly to the kitchen so you can enjoy fresh food.
                        When ready, you can settle your bill with <strong>"Pay the Bill"</strong> in <strong>Track Order</strong> or at the counter.
                      </>
                    )}
                  </p>
                </div>
              ) : (
                <div className="active-bill-payment-note">
                  <div className="abpn-header">
                    <Receipt size={16} />
                    <strong>Takeaway Order • Pickup: {pickupTime}</strong>
                  </div>
                  <p className="abpn-text">
                    Your takeaway order will be prepared fresh by our kitchen.
                    You can settle your bill with <strong>"Pay the Bill"</strong> from <strong>Track Order</strong> or at the counter.
                  </p>
                </div>
              )}

              {/* Payment Method Selector */}
              <span className="cf-label" style={{ marginTop: '12px' }}>Select Payment Method</span>
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
                {razorpayEnabled && (
                  <button
                    type="button"
                    className={paymentMode === 'razorpay' ? 'active' : ''}
                    aria-pressed={paymentMode === 'razorpay'}
                    onClick={() => setPaymentMode('razorpay')}
                  >
                    💳 Pay Online
                  </button>
                )}
              </div>

              <div className="payment-selected-hint">
                {paymentMode === 'razorpay' ? (
                  <span>💳 <strong>Pay Online selected:</strong> Settle online using Razorpay (UPI, Cards) via <strong>"Pay the Bill"</strong> after food is sent to kitchen.</span>
                ) : (
                  <span>💵 <strong>Cash selected:</strong> Pay cash physically at the cafe counter.</span>
                )}
              </div>

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
                  ? 'Sending to Kitchen...'
                  : orderType === 'dine-in'
                  ? activeTableOrder
                    ? `Add to Table Bill · ₹${total}`
                    : `Place Order (${paymentMode === 'razorpay' ? 'Pay Online' : 'Cash'}) · ₹${total}`
                  : `Place Order (${paymentMode === 'razorpay' ? 'Pay Online' : 'Cash'}) · ₹${total}`}
                <span>→</span>
              </button>
              <p className="secure-text">
                <Lock size={11} style={{ verticalAlign: '-1px' }} />{' '}
                Sent directly to kitchen • Settle with "Pay the Bill" in Track Order or Counter
              </p>
            </div>
          </form>
        )}

        {/* STEP 3: SUCCESS */}
        {step === 'success' && result && (
          <div className="cart-success">
            <div className="success-badge-wrap">
              <div className="success-badge-pulse" />
              <div className="success-badge-circle">
                <CheckCircle2 size={40} strokeWidth={2.4} className="success-badge-icon" />
              </div>
            </div>

            <div className="success-header-text">
              <span className="success-kicker">
                {result.isAddedToExistingBill ? 'ADDED TO SAME BILL' : 'ORDER CONFIRMED'}
              </span>
              <h3 className="success-title">
                {result.isAddedToExistingBill
                  ? `Added to Table ${result.tableNo} Bill!`
                  : `Thank you, ${customerName}!`}
              </h3>
              <p className="success-subtitle">
                {result.isAddedToExistingBill
                  ? 'Your new items were added directly to your current bill. Kitchen has started preparation!'
                  : 'Kitchen has received your order and started preparation.'}
              </p>
            </div>

            <div className="success-summary-card">
              <div className="summary-pill-row">
                <span className="summary-order-badge">
                  {result.order_number || `#YRN-${result.orderId}`}
                </span>
                <span className="summary-status-pill">
                  <span className="status-pulse-dot" /> In Kitchen
                </span>
              </div>

              <div className="summary-info-grid">
                <div className="summary-info-item">
                  <span className="info-item-label">SERVICE TYPE</span>
                  <strong className="info-item-value">
                    {result.orderType === 'dine-in'
                      ? `🍽️ Table ${result.tableNo || 'Assigned'}`
                      : `🛍️ Takeaway (${(result.pickupTime || 'asap').toUpperCase()})`}
                  </strong>
                </div>

                <div className="summary-info-item text-right">
                  <span className="info-item-label">TOTAL AMOUNT</span>
                  <strong className="info-item-value highlight-price">₹{result.total}</strong>
                </div>
              </div>

              <div className="summary-payment-mode-hint">
                <span>
                  {result.payment_status?.toLowerCase() === 'paid'
                    ? '✓ Paid in Full'
                    : result.isAddedToExistingBill
                    ? '📋 Added to running table tab • Settle after meal in Track Order'
                    : result.paymentMode === 'razorpay'
                    ? '💳 Pay Online via Track Order'
                    : '💵 Cash payment at counter'}
                </span>
              </div>
            </div>

            <div className="success-actions-stack">
              <button
                type="button"
                className="success-btn-primary"
                onClick={() => {
                  onClose();
                  if (onTrackOrder) {
                    onTrackOrder(result.orderId, result);
                  }
                }}
              >
                <ExternalLink size={18} />
                <span>Track Order & Pay the Bill →</span>
              </button>

              <button
                type="button"
                className="success-btn-secondary"
                onClick={() => setIsBillOpen(true)}
              >
                <Receipt size={17} />
                <span>View Bill / Receipt</span>
              </button>

              <button
                type="button"
                className="success-btn-tertiary"
                onClick={onExplore || onClose}
              >
                Back to Menu
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
          onPayBill={(ord) => {
            openRazorpayCheckout({
              orderId: ord.id || ord.orderId,
              customerName: customerName.trim(),
              customerPhone: customerPhone.trim(),
              customerEmail: user?.email || '',
              paymentToken: ord.payment_token || '',
              onSuccess: (verifyData) => {
                setResult((prev) => ({
                  ...prev,
                  payment_status: 'Paid',
                  paid_amount: verifyData.paid_amount || ord.total || ord.total_amount,
                  payment_reference: verifyData.payment_reference,
                }));
              },
            });
          }}
        />
      )}
    </>
  );
}