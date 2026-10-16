import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
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
  Package,
  Calendar,
  UtensilsCrossed,
  ChevronRight,
  User,
  LogIn,
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { getCafeSettings, playOrderChimeSound } from '../utils/cafeSettings';
import { formatTableLabel, normalizeTableNo } from '../utils/billingUtils';
import OrderBillModal from '../Components/OrderBillModal';
import './MyOrdersPage.css';

// 4 progress stages mapped to database order_status
const STAGES = [
  { key: 'accepted', label: 'Order Accepted', icon: CheckCircle2, desc: 'Cafe received your order' },
  { key: 'preparing', label: 'Preparing Food', icon: ChefHat, desc: 'Kitchen is cooking' },
  { key: 'almost_ready', label: 'Almost Ready', icon: Sparkles, desc: 'Plating & packing' },
  { key: 'ready', label: 'Ready to Serve', icon: BellRing, desc: 'Hot & fresh for you' },
];

function getActiveStageIndex(orderStatus) {
  const status = (orderStatus || '').toLowerCase().trim();
  if (status === 'ready' || status === 'delivered') return 3;
  if (status === 'almost ready' || status === 'plating') return 2;
  if (status === 'preparing' || status === 'cooking' || status === 'in kitchen') return 1;
  return 0;
}

export default function MyOrdersPage({ onNavigateToMenu, onBackHome }) {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const cafeSettings = getCafeSettings();

  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'history'
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Bill modal
  const [viewingBillOrder, setViewingBillOrder] = useState(null);
  const [isCopied, setIsCopied] = useState(false);
  const [showUpiQr, setShowUpiQr] = useState(false);
  const [utrInput, setUtrInput] = useState('');
  const [submittingUtr, setSubmittingUtr] = useState(false);
  const [utrSuccess, setUtrSuccess] = useState(false);

  // Cached order from route state or local storage
  const initialCached = useMemo(() => {
    if (location.state?.initialOrder) return location.state.initialOrder;
    try {
      const raw = localStorage.getItem('yaarana_last_order');
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  }, [location.state]);

  // Load orders from database with strict user isolation
  const fetchOrders = async (isSilent = false) => {
    if (!isSilent && orders.length === 0 && !initialCached) {
      setLoading(true);
    }
    if (isSilent) setIsRefreshing(true);

    try {
      let query = supabase
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
        .order('created_at', { ascending: false });

      if (user?.id) {
        // Authenticated customer: fetch only their orders
        query = query.eq('user_id', user.id);
      } else {
        // Guest: fetch only recent guest order if present
        const guestOrderId = orderId || localStorage.getItem('yaarana_last_order_id');
        if (guestOrderId) {
          const raw = String(guestOrderId).trim();
          const stripped = raw.replace(/^#/, '').replace(/^YRN-/i, '').trim();
          query = query.or(`id.eq."${raw}",id.eq."${stripped}"`);
        } else {
          setOrders(initialCached ? [initialCached] : []);
          setLoading(false);
          setIsRefreshing(false);
          return;
        }
      }

      const { data, error: fetchErr } = await query;
      if (fetchErr) throw fetchErr;

      let fetchedOrders = data || [];

      // If user passed a specific orderId in URL, prioritize selecting it
      if (orderId) {
        const rawId = String(orderId).trim();
        const strippedId = rawId.replace(/^#/, '').replace(/^YRN-/i, '').trim();
        const found = fetchedOrders.find(
          (o) =>
            o.id === rawId ||
            o.id === strippedId ||
            (/^\d+$/.test(strippedId) && String(o.id).endsWith(strippedId))
        );

        if (found) {
          setSelectedOrder(found);
        } else if (!user) {
          // If guest specified an orderId not in fetched, try fetching single
          const { data: singleOrder } = await supabase
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
            .or(`id.eq."${rawId}",id.eq."${strippedId}"`)
            .maybeSingle();

          if (singleOrder) {
            fetchedOrders = [singleOrder, ...fetchedOrders];
            setSelectedOrder(singleOrder);
          }
        }
      }

      // If no order explicitly selected, default to latest active order or latest order
      if (!selectedOrder && fetchedOrders.length > 0) {
        const activeOne = fetchedOrders.find((o) => {
          const st = (o.order_status || '').toLowerCase().trim();
          return st !== 'completed' && st !== 'delivered' && st !== 'cancelled';
        });
        setSelectedOrder(activeOne || fetchedOrders[0]);
      }

      // Check if status advanced to ready to play chime
      if (selectedOrder) {
        const updatedSelf = fetchedOrders.find((o) => o.id === selectedOrder.id);
        if (
          updatedSelf &&
          updatedSelf.order_status !== selectedOrder.order_status &&
          (updatedSelf.order_status || '').toLowerCase() === 'ready'
        ) {
          playOrderChimeSound();
        }
      }

      setOrders(fetchedOrders);
      setError(null);
    } catch (err) {
      console.error('Error loading orders:', err);
      if (orders.length === 0 && !initialCached) {
        setError('Unable to load your orders. Please check your connection.');
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders(!!initialCached);

    // Subscribe to realtime orders updates
    const channelId = `user-orders-${user?.id || 'guest'}`;
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
            const matchesUser = user?.id && payload.new.user_id === user.id;
            const matchesSelected = selectedOrder && payload.new.id === selectedOrder.id;

            if (matchesUser || matchesSelected) {
              fetchOrders(true);
              if ((payload.new.order_status || '').toLowerCase() === 'ready') {
                playOrderChimeSound();
              }
            }
          } else {
            fetchOrders(true);
          }
        }
      )
      .subscribe();

    // 3.5s high-frequency polling fallback
    const interval = setInterval(() => {
      fetchOrders(true);
    }, 3500);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user?.id, orderId]);

  // Helper to determine if an order is active/in-progress
  const isOrderActive = (o) => {
    if (!o) return false;
    const st = (o.order_status || '').toLowerCase().trim();
    return st !== 'completed' && st !== 'delivered' && st !== 'cancelled';
  };

  // Active orders: only currently active / in-kitchen orders (Pending, Preparing, Ready, etc.)
  const activeOrders = useMemo(() => {
    return orders.filter(isOrderActive);
  }, [orders]);

  // History orders: past / completed / delivered / cancelled orders
  const historyOrders = useMemo(() => {
    return orders.filter((o) => !isOrderActive(o));
  }, [orders]);

  const totalActiveCount = activeOrders.length;
  const totalHistoryCount = historyOrders.length;

  // The live status tracker is ONLY shown if there is a current active order
  const displayedTrackOrder = useMemo(() => {
    if (selectedOrder && isOrderActive(selectedOrder)) {
      return selectedOrder;
    }
    if (activeOrders.length > 0) {
      return activeOrders[0];
    }
    return null;
  }, [selectedOrder, activeOrders]);

  // If no active orders, default to the history tab
  useEffect(() => {
    if (!loading && activeOrders.length === 0 && historyOrders.length > 0) {
      setActiveTab((prev) => (prev === 'active' ? 'history' : prev));
    }
  }, [loading, activeOrders.length, historyOrders.length]);

  const handleOpenBillModal = (order) => {
    setViewingBillOrder(order);
  };

  // Handler to Order More Items for an open dine-in table
  const handleOrderMore = (tbl) => {
    const tableToUse = tbl || displayedTrackOrder?.table_no || '';
    if (tableToUse) {
      localStorage.setItem('yaarana_preselected_table', String(tableToUse));
    }
    if (onNavigateToMenu) {
      onNavigateToMenu();
    } else {
      navigate('/?table=' + encodeURIComponent(tableToUse));
    }
  };

  const handleCopyUpi = () => {
    if (cafeSettings.upiId) {
      navigator.clipboard.writeText(cafeSettings.upiId);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleSaveUtr = async (e) => {
    e.preventDefault();
    if (!utrInput.trim() || !displayedTrackOrder?.id) return;

    setSubmittingUtr(true);
    try {
      const { error: updateErr } = await supabase
        .from('orders')
        .update({ payment_reference: utrInput.trim() })
        .eq('id', displayedTrackOrder.id);

      if (updateErr && updateErr.code !== 'PGRST204') {
        throw updateErr;
      }

      setOrders((prev) =>
        prev.map((o) => (o.id === displayedTrackOrder.id ? { ...o, payment_reference: utrInput.trim() } : o))
      );
      if (selectedOrder?.id === displayedTrackOrder.id) {
        setSelectedOrder((prev) => (prev ? { ...prev, payment_reference: utrInput.trim() } : prev));
      }
      setUtrSuccess(true);
      setTimeout(() => setUtrSuccess(false), 4000);
    } catch (err) {
      console.error('Error saving reference:', err);
      alert('Could not submit reference: ' + err.message);
    } finally {
      setSubmittingUtr(false);
    }
  };

  const activeStageIndex = getActiveStageIndex(displayedTrackOrder?.order_status);
  const isCancelled = (displayedTrackOrder?.order_status || '').toLowerCase() === 'cancelled';
  const isCompleted = (displayedTrackOrder?.order_status || '').toLowerCase() === 'completed';
  const isPaid = (displayedTrackOrder?.payment_status || '').toLowerCase() === 'paid';
  const totalAmount = Number(displayedTrackOrder?.total_amount || displayedTrackOrder?.total || 0);

  const upiId = cafeSettings?.upiId || 'yaarana@upi';
  const upiPayUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=YAARANA%20Cafe&am=${totalAmount}&cu=INR&tn=Order%20${displayedTrackOrder?.id || ''}`;
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    upiPayUrl
  )}`;

  return (
    <div className="my-orders-page">
      {/* Top Header */}
      <header className="my-orders-header">
        <div className="header-inner">
          <button
            type="button"
            className="btn-header-back"
            onClick={() => (onNavigateToMenu ? onNavigateToMenu() : navigate('/'))}
          >
            <ArrowLeft size={18} /> Menu
          </button>
          <div className="header-brand">
            <span className="brand-title">YAARANA</span>
            <span className="brand-sub">
              <span className="pulse-dot" /> My Orders & Live Tracker
            </span>
          </div>
          <button
            type="button"
            className="btn-header-refresh"
            onClick={() => fetchOrders(false)}
            title="Refresh Orders"
            disabled={isRefreshing}
          >
            <RefreshCw size={16} className={isRefreshing ? 'spin-icon' : ''} />
          </button>
        </div>
      </header>

      <main className="my-orders-container">
        {/* Guest sign-in banner if not logged in */}
        {!user && (
          <div className="guest-login-banner">
            <div className="guest-banner-content">
              <div className="guest-banner-icon">
                <LogIn size={20} />
              </div>
              <div>
                <strong>Want to see all your past orders?</strong>
                <p>Log in or sign up to permanently save your order history and reorder your favorites in 1 click.</p>
              </div>
            </div>
            <button
              type="button"
              className="guest-login-btn"
              onClick={() => navigate('/login')}
            >
              Sign In
            </button>
          </div>
        )}

        {/* Loading state with zero cache */}
        {loading && orders.length === 0 && !displayedTrackOrder ? (
          <div className="orders-state-card">
            <div className="state-spinner" />
            <h3>Fetching your orders...</h3>
            <p>Connecting to YAARANA live kitchen stream</p>
          </div>
        ) : error && orders.length === 0 && !displayedTrackOrder ? (
          <div className="orders-state-card error-card">
            <AlertTriangle size={44} className="text-amber" />
            <h3>{error}</h3>
            <p>Please check your internet connection or verify your account.</p>
            <button
              type="button"
              className="orders-action-btn primary"
              onClick={() => (onNavigateToMenu ? onNavigateToMenu() : navigate('/'))}
            >
              Explore Menu
            </button>
          </div>
        ) : orders.length === 0 && !displayedTrackOrder ? (
          /* Empty state */
          <div className="orders-state-card empty-card">
            <div className="empty-icon-wrap">
              <Package size={52} strokeWidth={1.4} />
            </div>
            <h3>No orders yet!</h3>
            <p>You haven't placed any orders yet. Fresh burgers, hot pizzas, and cold coffee are waiting for you!</p>
            <button
              type="button"
              className="orders-action-btn primary"
              onClick={() => (onNavigateToMenu ? onNavigateToMenu() : navigate('/'))}
            >
              <UtensilsCrossed size={17} /> Explore Menu & Order
            </button>
          </div>
        ) : (
          <div className="orders-content-layout">
            {/* 1. TOP SPOTLIGHT: Active Order Live Tracker */}
            {displayedTrackOrder && (
              <section className="tracker-spotlight-card">
                <div className="tracker-card-header">
                  <div>
                    <span className="card-kicker">LIVE ORDER STATUS</span>
                    <h1 className="tracker-order-id">
                      {displayedTrackOrder.order_number || `#YRN-${displayedTrackOrder.id}`}
                    </h1>
                  </div>

                  <div className="tracker-badges-row">
                    <span className="badge-dining-type">
                      {displayedTrackOrder.order_type === 'dine-in'
                        ? `🍽️ Table ${displayedTrackOrder.table_no || 'TBD'}`
                        : `🛍️ Takeaway (${displayedTrackOrder.pickup_time || 'ASAP'})`}
                    </span>
                    <span className={`badge-payment-status ${isPaid ? 'paid' : 'pending'}`}>
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

                {/* Dine-In Table Status Panel */}
                {displayedTrackOrder.order_type === 'dine-in' && (
                  <div className="table-rounds-status-panel">
                    <div className="trsp-header">
                      <div className="trsp-info">
                        <span className="trsp-table-pill">🍽️ Table {displayedTrackOrder.table_no || 'TBD'}</span>
                        <span className="trsp-bill-pill">
                          Active Table Bill · ₹{totalAmount.toFixed(2)}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn-add-more-pill"
                        onClick={() => handleOrderMore(displayedTrackOrder.table_no)}
                      >
                        <ShoppingBag size={13} /> + Add More Items to Table
                      </button>
                    </div>
                  </div>
                )}

                {/* Cancelled Banner */}
                {isCancelled && (
                  <div className="tracker-banner cancelled">
                    <AlertTriangle size={20} />
                    <div>
                      <strong>This order was cancelled.</strong>
                      <p>If you have questions, please speak directly to the cafe manager.</p>
                    </div>
                  </div>
                )}

                {/* Completed Banner */}
                {isCompleted && (
                  <div className="tracker-banner completed">
                    <CheckCircle2 size={22} />
                    <div>
                      <strong>Order Completed!</strong>
                      <p>We hope you loved your meal. Thank you for dining with YAARANA!</p>
                    </div>
                  </div>
                )}

                {/* Stepper */}
                {!isCancelled && (
                  <div className="tracker-stepper-wrap">
                    <div className="stepper-track-bar">
                      <div
                        className="stepper-track-fill"
                        style={{
                          width: `${(activeStageIndex / (STAGES.length - 1)) * 100}%`,
                        }}
                      />
                    </div>

                    <div className="stepper-nodes-row">
                      {STAGES.map((stage, idx) => {
                        const Icon = stage.icon;
                        const isPast = idx < activeStageIndex;
                        const isCurrent = idx === activeStageIndex;
                        return (
                          <div
                            key={stage.key}
                            className={`stepper-node ${
                              isPast ? 'node-done' : isCurrent ? 'node-current' : 'node-waiting'
                            }`}
                          >
                            <div className="node-circle">
                              <Icon size={18} />
                            </div>
                            <span className="node-title">{stage.label}</span>
                            <span className="node-desc">{stage.desc}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Estimated Prep Time */}
                {!isCancelled && !isCompleted && (
                  <div className="prep-time-box">
                    <Clock size={17} className="prep-clock-icon" />
                    <span>Estimated Kitchen Prep Time: </span>
                    <strong>{cafeSettings.estimatedPrepTime || '15-20 mins'}</strong>
                  </div>
                )}

                {/* Quick actions for this tracked order */}
                <div className="tracker-actions-row">
                  <button
                    type="button"
                    className="tracker-btn secondary"
                    onClick={() => handleOpenBillModal(displayedTrackOrder)}
                  >
                    <Receipt size={16} /> View Bill / Receipt
                  </button>
                  <button
                    type="button"
                    className="tracker-btn primary"
                    onClick={() => handleOrderMore(displayedTrackOrder?.table_no)}
                  >
                    <ShoppingBag size={16} />{' '}
                    {displayedTrackOrder.order_type === 'dine-in' ? '+ Add More Items to Table' : 'Order More Food'}
                  </button>
                </div>

                {/* Payment instructions if payment pending */}
                {!isPaid && !isCancelled && (
                  <div className="tracker-payment-details">
                    <div className="payment-box-head">
                      <div>
                        <span className="pbox-label">
                          {displayedTrackOrder.order_type === 'dine-in'
                            ? `Total for Table ${displayedTrackOrder.table_no || ''}`
                            : 'Total to Pay at Counter'}
                        </span>
                        <strong className="pbox-amount">₹{totalAmount.toFixed(2)}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* 2. ORDER LISTING TABS (Active Orders & Order History) */}
            <section className="orders-tabs-section">
              <div className="tabs-bar">
                <button
                  type="button"
                  className={`tab-btn ${activeTab === 'active' ? 'active' : ''}`}
                  onClick={() => setActiveTab('active')}
                >
                  Active Orders ({totalActiveCount})
                </button>
                <button
                  type="button"
                  className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                  onClick={() => setActiveTab('history')}
                >
                  Order History ({totalHistoryCount})
                </button>
              </div>

              {/* ACTIVE TAB */}
              {activeTab === 'active' && (
                <div className="orders-list">
                  {totalActiveCount === 0 ? (
                    <div className="tab-empty-box">
                      <p>No active orders right now.</p>
                    </div>
                  ) : (
                    activeOrders.map((ord) => {
                      const isSelected = selectedOrder?.id === ord.id;
                      const isOrdPaid = (ord.payment_status || '').toLowerCase() === 'paid';
                      const itemsSummary = (ord.order_items || [])
                        .map((i) => `${i.quantity}x ${i.item_name || i.menu_items?.name || 'Item'}`)
                        .join(', ');

                      return (
                        <div
                          key={ord.id}
                          className={`order-card-row ${isSelected ? 'highlight-selected' : ''}`}
                          onClick={() => setSelectedOrder(ord)}
                        >
                          <div className="card-left">
                            <div className="card-title-row">
                              <span className="card-order-id">
                                {ord.order_type === 'dine-in'
                                  ? `Table ${ord.table_no || 'TBD'} · ${ord.order_number || `#YRN-${ord.id}`}`
                                  : ord.order_number || `#YRN-${ord.id}`}
                              </span>
                              <span className="card-order-date">
                                {new Date(ord.created_at).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <p className="card-items-snippet">{itemsSummary || 'Dine-in meal items'}</p>
                            <div className="card-tags-row">
                              <span className="tag-type">
                                {ord.order_type === 'dine-in'
                                  ? `🍽️ Table ${ord.table_no || 'TBD'}`
                                  : `🛍️ Takeaway (${ord.pickup_time || 'ASAP'})`}
                              </span>
                              <span className="tag-status">
                                ⏳ {ord.order_status || 'In Kitchen'}
                              </span>
                              <span className={`tag-pay ${isOrdPaid ? 'tag-paid' : 'tag-pending'}`}>
                                {isOrdPaid ? 'Paid' : 'Unpaid'}
                              </span>
                            </div>
                          </div>

                          <div className="card-right">
                            <span className="card-price">₹{Number(ord.total_amount || 0).toFixed(2)}</span>
                            <div className="card-btn-stack">
                              {ord.order_type === 'dine-in' && !isOrdPaid && (
                                <button
                                  type="button"
                                  className="btn-order-more-mini"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOrderMore(ord.table_no);
                                  }}
                                  title="Add more items to this table"
                                >
                                  <ShoppingBag size={12} /> Add Items
                                </button>
                              )}
                              <button
                                type="button"
                                className="btn-card-bill"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenBillModal(ord);
                                }}
                                title="View Bill"
                              >
                                <Receipt size={12} /> Bill
                              </button>
                              <button
                                type="button"
                                className="btn-card-track"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedOrder(ord);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                              >
                                Track <ChevronRight size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* HISTORY TAB */}
              {activeTab === 'history' && (
                <div className="orders-list">
                  {totalHistoryCount === 0 ? (
                    <div className="tab-empty-box">
                      <p>You have no previous completed orders yet.</p>
                    </div>
                  ) : (
                    historyOrders.map((ord) => {
                      const itemsSummary = (ord.order_items || [])
                        .map((i) => `${i.quantity}x ${i.item_name || i.menu_items?.name || 'Item'}`)
                        .join(', ');

                      const isOrdPaid = (ord.payment_status || '').toLowerCase() === 'paid';
                      const formattedDate = new Date(ord.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      });

                      return (
                        <div key={ord.id} className="order-card-row history-card">
                          <div className="card-left">
                            <div className="card-title-row">
                              <span className="card-order-id">
                                {ord.order_type === 'dine-in'
                                  ? `Table ${ord.table_no || 'TBD'} · ${ord.order_number || `#YRN-${ord.id}`}`
                                  : ord.order_number || `#YRN-${ord.id}`}
                              </span>
                              <span className="card-order-date">{formattedDate}</span>
                            </div>
                            <p className="card-items-snippet">{itemsSummary || 'Delicious food order'}</p>
                            <div className="card-tags-row">
                              <span className={(ord.order_status || '').toLowerCase() === 'cancelled' ? 'tag-cancelled' : 'tag-completed'}>
                                {(ord.order_status || '').toLowerCase() === 'cancelled' ? '❌ Cancelled' : '✓ Completed'}
                              </span>
                              <span className={`tag-pay ${isOrdPaid ? 'tag-paid' : 'tag-pending'}`}>
                                {isOrdPaid ? 'Paid' : 'Unpaid'}
                              </span>
                            </div>
                          </div>

                          <div className="card-right">
                            <span className="card-price">₹{Number(ord.total_amount || 0).toFixed(2)}</span>
                            <button
                              type="button"
                              className="btn-card-bill"
                              onClick={() => handleOpenBillModal(ord)}
                            >
                              <Receipt size={14} /> View Receipt
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* Printable Receipt / Bill Modal */}
      {viewingBillOrder && (
        <OrderBillModal
          isOpen={!!viewingBillOrder}
          onClose={() => setViewingBillOrder(null)}
          order={viewingBillOrder}
        />
      )}
    </div>
  );
}
