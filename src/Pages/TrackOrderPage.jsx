import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  ChefHat,
  BellRing,
  Sparkles,
  ArrowLeft,
  Receipt,
  AlertTriangle,
  QrCode,
  Copy,
  Check,
  RefreshCw,
  ShoppingBag,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { getCafeSettings, playOrderChimeSound } from '../utils/cafeSettings';
import OrderBillModal from '../Components/OrderBillModal';
import './TrackOrderPage.css';

// 4 progress stages mapped to database order_status
const STAGES = [
  { key: 'accepted', label: 'Order Accepted', icon: CheckCircle2, desc: 'Cafe received your order' },
  { key: 'preparing', label: 'Preparing Your Food', icon: ChefHat, desc: 'Kitchen is cooking your meal' },
  { key: 'almost_ready', label: 'Almost Ready', icon: Sparkles, desc: 'Plating and packing' },
  { key: 'ready', label: 'Ready to Serve', icon: BellRing, desc: 'Hot & fresh, ready for you' },
];

/**
 * Maps actual database status string to stage index (0 to 3)
 */
function getActiveStageIndex(orderStatus) {
  const status = (orderStatus || '').toLowerCase().trim();
  if (status === 'ready' || status === 'delivered') return 3;
  if (status === 'almost ready' || status === 'plating') return 2;
  if (status === 'preparing' || status === 'cooking' || status === 'in kitchen') return 1;
  // 'pending', 'accepted', 'received'
  return 0;
}

export default function TrackOrderPage({ onNavigateToMenu, onBackHome }) {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const cafeSettings = getCafeSettings();

  // Try to pre-fill from navigation state or localStorage for INSTANT 0ms rendering
  const getInitialCachedOrder = () => {
    if (location.state?.initialOrder) {
      return location.state.initialOrder;
    }
    try {
      const savedStr = localStorage.getItem('yaarana_last_order');
      if (savedStr) {
        const saved = JSON.parse(savedStr);
        const raw = String(orderId || '').trim();
        const stripped = raw.replace(/^#/, '').replace(/^YRN-/i, '').trim();
        const savedId = String(saved.id || saved.orderId || '').trim();
        if (
          savedId === raw ||
          savedId === stripped ||
          (stripped && savedId.endsWith(stripped))
        ) {
          return saved;
        }
      }
    } catch {
      /* ignore */
    }
    return null;
  };

  const cachedOrder = getInitialCachedOrder();
  const [order, setOrder] = useState(cachedOrder);
  const [loading, setLoading] = useState(!cachedOrder);
  const [error, setError] = useState(null);
  const [isBillOpen, setIsBillOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showUpiQr, setShowUpiQr] = useState(false);
  const [submittingUtr, setSubmittingUtr] = useState(false);
  const [utrInput, setUtrInput] = useState('');
  const [utrSuccess, setUtrSuccess] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch order details by ID (handles alphanumeric IDs like YAA-1016, ORD-001, and numbers)
  const fetchOrderDetails = async (isSilent = false) => {
    if (!orderId) {
      setError('No order ID provided.');
      setLoading(false);
      return;
    }

    if (!isSilent && !order) setLoading(true);
    if (isSilent) setIsRefreshing(true);

    try {
      const raw = String(orderId || '').trim();
      const stripped = raw.replace(/^#/, '').replace(/^YRN-/i, '').trim();

      // 1. Direct query with raw or stripped ID
      let { data, error: fetchErr } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            quantity,
            unit_price,
            menu_items (
              name,
              price
            )
          )
        `)
        .or(`id.eq."${raw}",id.eq."${stripped}"`)
        .maybeSingle();

      // 2. If not found and input contains digits, match suffix (e.g. 1016 -> YAA-1016)
      if (!data && /^\d+$/.test(stripped)) {
        const { data: suffixMatches, error: suffixErr } = await supabase
          .from('orders')
          .select(`
            *,
            order_items (
              quantity,
              unit_price,
              menu_items (
                name,
                price
              )
            )
          `)
          .ilike('id', `%${stripped}`)
          .order('created_at', { ascending: false })
          .limit(1);

        if (!suffixErr && suffixMatches && suffixMatches.length > 0) {
          data = suffixMatches[0];
        }
      }

      if (fetchErr && !data) throw fetchErr;

      if (!data) {
        if (!order) {
          setError('Order not found. Please verify your order link or contact cafe staff.');
          setOrder(null);
        }
      } else {
        // Play gentle chime if status advanced to ready
        if (order && order.order_status !== data.order_status) {
          if ((data.order_status || '').toLowerCase() === 'ready') {
            playOrderChimeSound();
          }
        }
        setOrder(data);
        setError(null);
        setLastRefreshed(new Date());
        try {
          localStorage.setItem('yaarana_last_order', JSON.stringify(data));
          localStorage.setItem('yaarana_last_order_id', String(data.id));
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      console.error('Error fetching order for tracking:', err);
      if (!order) {
        setError('Failed to load order. Please check your connection.');
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrderDetails(!!cachedOrder);

    const raw = String(orderId || '').trim();
    const stripped = raw.replace(/^#/, '').replace(/^YRN-/i, '').trim();

    // 1. Subscribe to Supabase Realtime for this order and its items
    const channelId = `order-track-${order?.id || stripped || raw}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          if (payload.new) {
            const newId = String(payload.new.id || '');
            if (
              newId === raw ||
              newId === stripped ||
              (order?.id && newId === order.id) ||
              (/^\d+$/.test(stripped) && newId.endsWith(stripped))
            ) {
              setOrder((prev) => (prev ? { ...prev, ...payload.new } : payload.new));
              fetchOrderDetails(true);
              if ((payload.new.order_status || '').toLowerCase() === 'ready') {
                playOrderChimeSound();
              }
            }
          } else {
            fetchOrderDetails(true);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_items',
        },
        () => {
          fetchOrderDetails(true);
        }
      )
      .subscribe();

    // 2. High-speed fallback polling every 3.5s to ensure immediate responsiveness
    const interval = setInterval(() => {
      fetchOrderDetails(true);
    }, 3500);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [orderId, order?.id]);

  const handleCopyUpi = () => {
    if (cafeSettings.upiId) {
      navigator.clipboard.writeText(cafeSettings.upiId);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleSaveUtr = async (e) => {
    e.preventDefault();
    if (!utrInput.trim() || !orderId) return;

    setSubmittingUtr(true);
    try {
      const targetId = order?.id || orderId;
      const { error: updateErr } = await supabase
        .from('orders')
        .update({ payment_reference: utrInput.trim() })
        .eq('id', targetId);

      if (updateErr) {
        if (updateErr.code === 'PGRST204') {
          console.warn('payment_reference column not found in orders schema, stored locally.');
        } else {
          throw updateErr;
        }
      }

      setOrder((prev) => (prev ? { ...prev, payment_reference: utrInput.trim() } : prev));
      setUtrSuccess(true);
      setTimeout(() => setUtrSuccess(false), 4000);
    } catch (err) {
      console.error('Error saving transaction ref:', err);
      alert('Could not submit reference: ' + err.message);
    } finally {
      setSubmittingUtr(false);
    }
  };

  const activeStageIndex = getActiveStageIndex(order?.order_status);
  const isCancelled = (order?.order_status || '').toLowerCase() === 'cancelled';
  const isCompleted = (order?.order_status || '').toLowerCase() === 'completed';
  const isPaid = (order?.payment_status || '').toLowerCase() === 'paid';
  const totalAmount = Number(order?.total_amount || order?.total || 0);

  // Construct UPI payment intent URL for QR code
  const upiId = cafeSettings?.upiId || 'yaarana@upi';
  const upiPayUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=YAARANA%20Cafe&am=${totalAmount}&cu=INR&tn=Order%20${orderId}`;
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    upiPayUrl
  )}`;

  return (
    <div className="track-order-page">
      {/* Top Navigation Bar */}
      <header className="track-header-bar">
        <div className="track-header-inner">
          <button
            type="button"
            className="track-back-btn"
            onClick={() => (onNavigateToMenu ? onNavigateToMenu() : navigate('/'))}
          >
            <ArrowLeft size={18} /> Menu
          </button>
          <div className="track-brand">
            <span className="track-cafe-title">YAARANA</span>
            <span className="track-live-tag">
              <span className="track-pulse-dot" /> Live Order Tracker
            </span>
          </div>
          <button
            type="button"
            className="track-refresh-btn"
            onClick={() => fetchOrderDetails(false)}
            title="Refresh order status"
            disabled={isRefreshing}
          >
            <RefreshCw size={16} className={isRefreshing ? 'spin-icon' : ''} />
          </button>
        </div>
      </header>

      <main className="track-main-container">
        {loading && !order ? (
          <div className="track-state-card">
            <div className="track-spinner" />
            <h3>Fetching your order details...</h3>
            <p>Connecting to YAARANA live kitchen stream</p>
          </div>
        ) : error ? (
          <div className="track-state-card error-card">
            <AlertTriangle size={48} className="text-amber" />
            <h3>{error}</h3>
            <p>If you placed this order recently, please ask our counter staff or check your network.</p>
            <button
              type="button"
              className="track-action-btn primary"
              onClick={() => (onNavigateToMenu ? onNavigateToMenu() : navigate('/'))}
            >
              Back to Menu
            </button>
          </div>
        ) : order ? (
          <div className="track-content-grid">
            {/* LEFT / MAIN COLUMN: Order Status Tracker */}
            <section className="track-card status-card">
              {/* Card Header */}
              <div className="track-card-header">
                <div>
                  <span className="track-meta-label">ORDER NUMBER</span>
                  <h1 className="track-order-id">
                    {order.order_number || `#YRN-${order.id}`}
                  </h1>
                </div>
                <div className="track-badges-group">
                  <span className="track-type-badge">
                    {order.order_type === 'dine-in'
                      ? `🍽️ Table ${order.table_no || 'TBD'}`
                      : `🛍️ Takeaway (${order.pickup_time || 'ASAP'})`}
                  </span>
                  <span className={`track-payment-badge ${isPaid ? 'paid' : 'pending'}`}>
                    {isPaid ? (
                      <>
                        <CheckCircle2 size={13} /> Paid
                      </>
                    ) : (
                      <>
                        <Clock size={13} /> Payment Pending
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Cancelled Banner */}
              {isCancelled && (
                <div className="track-alert-banner cancelled">
                  <AlertTriangle size={20} />
                  <div>
                    <strong>This order was cancelled.</strong>
                    <p>If you have any questions, please speak directly to the cafe manager.</p>
                  </div>
                </div>
              )}

              {/* Completed Banner */}
              {isCompleted && (
                <div className="track-alert-banner completed">
                  <CheckCircle2 size={22} />
                  <div>
                    <strong>Order Completed!</strong>
                    <p>We hope you loved your food. Thank you for dining at YAARANA!</p>
                  </div>
                </div>
              )}

              {/* Progress Stepper (if active) */}
              {!isCancelled && (
                <div className="track-stepper-container">
                  <div className="track-stepper-progress-bar">
                    <div
                      className="track-stepper-progress-fill"
                      style={{
                        width: `${(activeStageIndex / (STAGES.length - 1)) * 100}%`,
                      }}
                    />
                  </div>

                  <div className="track-steps-row">
                    {STAGES.map((stage, idx) => {
                      const Icon = stage.icon;
                      const isPast = idx < activeStageIndex;
                      const isCurrent = idx === activeStageIndex;
                      return (
                        <div
                          key={stage.key}
                          className={`track-step-node ${
                            isPast ? 'step-done' : isCurrent ? 'step-current' : 'step-waiting'
                          }`}
                        >
                          <div className="track-step-circle">
                            <Icon size={18} />
                          </div>
                          <span className="track-step-title">{stage.label}</span>
                          <span className="track-step-desc">{stage.desc}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Estimated Prep Time Banner */}
              {!isCancelled && !isCompleted && (
                <div className="track-prep-info">
                  <Clock size={18} className="prep-clock-icon" />
                  <div>
                    <span>Estimated Kitchen Prep Time: </span>
                    <strong>{cafeSettings.estimatedPrepTime || '15-20 mins'}</strong>
                  </div>
                </div>
              )}

              {/* Action Buttons Row */}
              <div className="track-card-actions">
                <button
                  type="button"
                  className="track-action-btn secondary"
                  onClick={() => setIsBillOpen(true)}
                >
                  <Receipt size={17} /> View Bill / Receipt
                </button>
                <button
                  type="button"
                  className="track-action-btn primary"
                  onClick={() => {
                    if (order?.order_type === 'dine-in' && order?.table_no) {
                      localStorage.setItem('yaarana_preselected_table', String(order.table_no));
                    }
                    if (onNavigateToMenu) {
                      onNavigateToMenu();
                    } else {
                      navigate(order?.table_no ? `/?table=${encodeURIComponent(order.table_no)}` : '/');
                    }
                  }}
                >
                  <ShoppingBag size={17} />{' '}
                  {order?.order_type === 'dine-in' ? '+ Add More Items to Table' : 'Continue Exploring Menu'}
                </button>
              </div>
            </section>

            {/* RIGHT COLUMN: Payment Details & Counter Instructions */}
            <section className="track-card payment-card">
              <h2 className="track-section-title">Payment & Collection</h2>

              {isPaid ? (
                <div className="track-payment-settled">
                  <div className="settled-icon-wrap">
                    <CheckCircle2 size={38} className="text-green" />
                  </div>
                  <h3>Payment Received</h3>
                  <p className="settled-amount">₹{totalAmount.toFixed(2)} Paid in full</p>
                  <p className="settled-sub">
                    Via {order.payment_mode ? order.payment_mode.toUpperCase() : 'COUNTER'}
                    {order.paid_at &&
                      ` on ${new Date(order.paid_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}`}
                  </p>
                  {order.payment_reference && (
                    <p className="settled-ref">
                      Ref / UTR: <code>{order.payment_reference}</code>
                    </p>
                  )}
                </div>
              ) : (
                <div className="track-payment-unsettled">
                  <div className="unsettled-amount-box">
                    <span className="unsettled-label">Total to Pay</span>
                    <strong className="unsettled-value">₹{totalAmount.toFixed(2)}</strong>
                  </div>

                  <div className="unsettled-instruction">
                    <span className="inst-badge">Counter Payment Required</span>
                    <p>
                      Please pay <strong>₹{totalAmount.toFixed(2)}</strong> at the cash counter.
                      Our staff will verify your receipt and mark your order as paid.
                    </p>
                  </div>

                  {/* UPI QR & VPA Payment Option */}
                  {cafeSettings.upiPaymentEnabled !== false && (
                    <div className="track-upi-box">
                      <div className="track-upi-header">
                        <span>Pay directly via UPI</span>
                        <button
                          type="button"
                          className="toggle-qr-btn"
                          onClick={() => setShowUpiQr(!showUpiQr)}
                        >
                          <QrCode size={14} /> {showUpiQr ? 'Hide QR' : 'Show UPI QR'}
                        </button>
                      </div>

                      <div className="track-vpa-row">
                        <span className="vpa-text">{upiId}</span>
                        <button
                          type="button"
                          className="copy-vpa-btn"
                          onClick={handleCopyUpi}
                          title="Copy UPI ID"
                        >
                          {isCopied ? <Check size={14} /> : <Copy size={14} />}
                          <span>{isCopied ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>

                      {showUpiQr && (
                        <div className="track-qr-preview">
                          <img
                            src={qrCodeImageUrl}
                            alt="Scan & Pay YAARANA Cafe"
                            className="track-qr-img"
                          />
                          <p className="track-qr-note">Scan with GPay, PhonePe, Paytm, or BHIM</p>
                        </div>
                      )}

                      {/* Optional Transaction Reference / UTR Submission */}
                      <form className="track-utr-form" onSubmit={handleSaveUtr}>
                        <label htmlFor="utr-input" className="utr-label">
                          Already paid online? Enter UPI UTR / Ref Number:
                        </label>
                        <div className="utr-input-group">
                          <input
                            id="utr-input"
                            type="text"
                            placeholder="e.g. 428901234567"
                            value={utrInput || order.payment_reference || ''}
                            onChange={(e) => setUtrInput(e.target.value)}
                            disabled={submittingUtr || isPaid}
                            className="utr-input"
                          />
                          <button
                            type="submit"
                            disabled={submittingUtr || isPaid || !utrInput.trim()}
                            className="utr-submit-btn"
                          >
                            {submittingUtr ? 'Saving...' : 'Submit'}
                          </button>
                        </div>
                        {utrSuccess && (
                          <p className="utr-success-text">
                            ✓ Reference submitted! Counter staff will verify and confirm.
                          </p>
                        )}
                      </form>
                    </div>
                  )}
                </div>
              )}

              {/* Order Items Snapshot Card */}
              <div className="track-order-summary-box">
                <h3 className="summary-title">Ordered Items</h3>
                <div className="summary-items-list">
                  {order.order_items && order.order_items.length > 0 ? (
                    order.order_items.map((item, idx) => {
                      const name =
                        item.item_name ||
                        item.menu_items?.name ||
                        `Item #${idx + 1}`;
                      const qty = item.quantity || 1;
                      const price = Number(item.unit_price || item.menu_items?.price || 0);
                      return (
                        <div className="summary-item-row" key={item.id || idx}>
                          <span className="summary-item-name">
                            {qty} × {name}
                          </span>
                          <span className="summary-item-price">
                            ₹{(price * qty).toFixed(2)}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="no-items-text">Items snapshot recorded with order.</p>
                  )}
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </main>

      {/* Printable Bill Modal */}
      {order && (
        <OrderBillModal
          isOpen={isBillOpen}
          onClose={() => setIsBillOpen(false)}
          order={order}
        />
      )}
    </div>
  );
}
