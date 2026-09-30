import React, { useState, useEffect } from 'react';
import { X, Trash2, ShoppingCart, ArrowLeft, CheckCircle2, Lock } from 'lucide-react';
import { supabase } from '../supabaseClient';
import './Cart.css';

const PICKUP_OPTIONS = ['ASAP', 'In 15 minutes', 'In 30 minutes', 'In 45 minutes', 'In 1 hour'];
const SAVED_CUSTOMER_KEY = 'yaarana_customer';

// Name and phone are remembered on this device for the next order
const loadSavedCustomer = () => {
  try {
    return JSON.parse(localStorage.getItem(SAVED_CUSTOMER_KEY)) || {};
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
}) {
  // 'cart' -> 'checkout' -> 'success'
  const [step, setStep] = useState('cart');

  const [customerName, setCustomerName] = useState(() => loadSavedCustomer().name || '');
  const [customerPhone, setCustomerPhone] = useState(() => loadSavedCustomer().phone || '');
  const [orderType, setOrderType] = useState(defaultTable ? 'dine-in' : 'dine-in');
  const [tableNo, setTableNo] = useState(defaultTable);
  const [pickupTime, setPickupTime] = useState(PICKUP_OPTIONS[0]);
  const [paymentMode, setPaymentMode] = useState('cash');

  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal;

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
    setPlacing(true);
    setError('');

    const { data, error: rpcError } = await supabase.rpc('place_order', {
      p_customer_name: customerName,
      p_customer_phone: customerPhone,
      p_order_type: orderType,
      p_table_no: orderType === 'dine-in' ? tableNo : null,
      p_pickup_time: orderType === 'takeaway' ? pickupTime : null,
      p_payment_mode: paymentMode,
      p_items: items.map((item) => ({ menu_item_id: item.id, quantity: item.quantity })),
    });

    if (rpcError) {
      console.error('Error placing order:', rpcError.message);
      setError(rpcError.message);
      setPlacing(false);
      return;
    }

    try {
      localStorage.setItem(
        SAVED_CUSTOMER_KEY,
        JSON.stringify({ name: customerName, phone: customerPhone })
      );
    } catch {
      /* ignore */
    }

    setResult({
      orderId: data.order_id,
      total: Number(data.total),
      orderType,
      tableNo,
      pickupTime,
    });
    clearCart();
    setStep('success');
    setPlacing(false);
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
                <div className="bill-row total-row">
                  <span>Total</span>
                  <strong>₹{total}</strong>
                </div>

                <button
                  type="button"
                  className="checkout-button"
                  onClick={() => setStep('checkout')}
                >
                  Proceed to Checkout
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

              <span className="cf-label">Payment</span>
              <div className="cf-segment" role="group" aria-label="Payment mode">
                <button
                  type="button"
                  className={paymentMode === 'cash' ? 'active' : ''}
                  aria-pressed={paymentMode === 'cash'}
                  onClick={() => setPaymentMode('cash')}
                >
                  Cash at counter
                </button>
                <button
                  type="button"
                  className={paymentMode === 'upi' ? 'active' : ''}
                  aria-pressed={paymentMode === 'upi'}
                  onClick={() => setPaymentMode('upi')}
                >
                  UPI at counter
                </button>
              </div>

              {error && <p className="cf-error">{error}</p>}
            </div>

            <div className="cart-bottom">
              <button type="submit" className="checkout-button" disabled={placing}>
                {placing ? 'Placing order...' : `Place order · ₹${total}`}
              </button>
              <p className="secure-text">
                <Lock size={11} style={{ verticalAlign: '-1px' }} /> You pay when you collect or at the table
              </p>
            </div>
          </form>
        )}

        {/* STEP 3: SUCCESS */}
        {step === 'success' && result && (
          <div className="cart-success">
            <CheckCircle2 size={64} strokeWidth={1.6} className="success-icon" />
            <h3>Thank you, {customerName}!</h3>
            <p className="success-id">Order {result.orderId}</p>
            <p>
              {result.orderType === 'dine-in'
                ? `We'll bring your order to table ${result.tableNo}.`
                : `Your order will be ready for pickup: ${result.pickupTime.toLowerCase()}.`}
            </p>
            <p className="success-total">Total to pay: ₹{result.total}</p>
            <button type="button" className="checkout-button" onClick={onExplore || onClose}>
              Back to menu
            </button>
          </div>
        )}
      </aside>
    </>
  );
}