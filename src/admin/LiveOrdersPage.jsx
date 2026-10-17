import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle,
  Clock,
  ChefHat,
  BellRing,
  CheckCircle2,
  Receipt,
  AlertCircle,
  Phone,
  User,
  Coffee,
  X,
  CreditCard,
  DollarSign,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { getCafeSettings, playOrderChimeSound } from '../utils/cafeSettings';
import OrderBillModal from '../Components/OrderBillModal';
import './LiveOrdersPage.css';

export default function LiveOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // State for Editing Modal
  const [editingOrder, setEditingOrder] = useState(null);
  const [editTableNo, setEditTableNo] = useState('');
  const [editTotalAmount, setEditTotalAmount] = useState('');

  // State for adding new items in edit modal
  const [selectedMenuItemId, setSelectedMenuItemId] = useState('');
  const [itemQuantity, setItemQuantity] = useState(1);
  const [originalOrderTotal, setOriginalOrderTotal] = useState(0);

  // State for Mark-As-Paid Confirmation Modal
  const [confirmingPaymentOrder, setConfirmingPaymentOrder] = useState(null);
  const [markingPaid, setMarkingPaid] = useState(false);

  // State for Unpaid Order Complete Confirmation Modal
  const [unpaidOrderToComplete, setUnpaidOrderToComplete] = useState(null);
  const [completingWithPay, setCompletingWithPay] = useState(false);

  // State for Viewing/Printing Customer Bill
  const [viewingBillOrder, setViewingBillOrder] = useState(null);

  const knownOrderIdsRef = useRef(null);
  const lastChimeTimeRef = useRef(0);

  const triggerOrderChime = () => {
    const now = Date.now();
    if (now - lastChimeTimeRef.current < 2000) return;
    lastChimeTimeRef.current = now;
    const currentSettings = getCafeSettings();
    if (currentSettings.newOrderAlerts !== false) {
      playOrderChimeSound();
    }
  };

  useEffect(() => {
    fetchLiveOrders();
    // Pre-fetch menu items in background so edit modal opens instantly
    fetchMenuItems();

    // Subscribe to realtime changes on orders and order_items tables
    const ordersChannel = supabase
      .channel('live-orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          fetchLiveOrders(true);
          if (payload.eventType === 'INSERT') {
            triggerOrderChime();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        () => {
          fetchLiveOrders(true);
        }
      )
      .subscribe();

    // High-speed polling fallback (3.5s) to guarantee instantaneous order discovery
    const interval = setInterval(() => {
      fetchLiveOrders(true);
    }, 3500);

    return () => {
      supabase.removeChannel(ordersChannel);
      clearInterval(interval);
    };
  }, []);

  const fetchLiveOrders = async (isSilent = false) => {
    if (!isSilent && orders.length === 0) setLoading(true);
    if (isSilent) setIsRefreshing(true);
    try {
      // Query ONLY active orders at DB level for 10x faster response time
      const { data, error } = await supabase
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
        .not('order_status', 'in', '("Completed","completed","Cancelled","cancelled","Delivered","delivered")')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter as safeguard against any status variations
      const activeData = (data || []).filter((order) => {
        const status = (order.order_status || '').toLowerCase().trim();
        return status !== 'completed' && status !== 'delivered' && status !== 'cancelled';
      });

      const formattedOrders = activeData.map((order) => {
        let itemsDescription = 'Café Order Items';
        if (order.order_items && order.order_items.length > 0) {
          itemsDescription = order.order_items
            .map((item) => {
              const dishName = item.item_name || item.menu_items?.name || 'Item';
              return `${item.quantity}x ${dishName}`;
            })
            .join(', ');
        }

        const orderNum = order.order_number || `#YRN-${order.id}`;

        return {
          id: orderNum,
          rawId: order.id,
          orderNumber: orderNum,
          customerName: order.customer_name || 'Guest',
          customerPhone: order.customer_phone || '',
          orderType: order.order_type || 'dine-in',
          tableNo: order.table_no || (order.order_type === 'takeaway' ? 'Takeaway' : 'Table 1'),
          pickupTime: order.pickup_time || '',
          bookedTime: new Date(order.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          items: itemsDescription,
          totalAmount: parseFloat(order.total_amount || 0),
          paidAmount: parseFloat(order.paid_amount || 0),
          paymentStatus:
            (order.payment_status && order.payment_status.trim().toUpperCase() === 'PAID') ||
            (parseFloat(order.total_amount || 0) > 0 && parseFloat(order.paid_amount || 0) >= parseFloat(order.total_amount || 0))
              ? 'PAID'
              : order.payment_status
              ? order.payment_status.trim().toUpperCase()
              : 'PENDING',
          orderStatus: order.order_status || 'Pending',
          paymentReference: order.payment_reference || '',
          paidAt: order.paid_at || null,
          verifiedBy: order.verified_by || null,
          rawOrder: order,
        };
      });

      if (knownOrderIdsRef.current !== null) {
        const hasNewOrder = formattedOrders.some((o) => !knownOrderIdsRef.current.has(o.rawId));
        if (hasNewOrder) {
          triggerOrderChime();
        }
      }
      knownOrderIdsRef.current = new Set(formattedOrders.map((o) => o.rawId));

      setOrders(formattedOrders);
    } catch (error) {
      console.error('Error fetching live orders:', error.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const { data, error } = await supabase.from('menu_items').select('*');
      if (error) throw error;
      setMenuItems(data || []);
    } catch (error) {
      console.error('Error fetching menu items:', error.message);
    }
  };

  // Step-by-step preparation status transitions
  const handleUpdateOrderStatus = async (rawId, nextStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ order_status: nextStatus })
        .eq('id', rawId);

      if (error) throw error;

      if (nextStatus.toLowerCase() === 'completed') {
        setOrders((prev) => prev.filter((o) => o.rawId !== rawId));
      } else {
        setOrders((prev) =>
          prev.map((o) => (o.rawId === rawId ? { ...o, orderStatus: nextStatus } : o))
        );
      }
    } catch (error) {
      console.error(`Error updating order status to ${nextStatus}:`, error.message);
      alert(`Failed to update order status: ${error.message}`);
    }
  };

  const handleCancelOrder = async (rawId) => {
    const confirmed = window.confirm('Are you sure you want to cancel this order? This cannot be undone.');
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({ order_status: 'Cancelled' })
        .eq('id', rawId);

      if (error) throw error;
      setOrders(orders.filter((order) => order.rawId !== rawId));
    } catch (error) {
      console.error('Error cancelling order:', error.message);
      alert('Failed to cancel order: ' + error.message);
    }
  };

  // Handler for Complete & Clear button click - prevents clearing unpaid or partially paid orders
  const handleCompleteOrderClick = (order) => {
    const isUnsettled = (order.paymentStatus || '').toUpperCase() !== 'PAID';
    if (isUnsettled) {
      // Intercept unpaid/partial order to prevent clearing without collecting full balance
      setUnpaidOrderToComplete(order);
      return;
    }
    handleUpdateOrderStatus(order.rawId, 'Completed');
  };

  // 1-Click: Confirm payment collected & Complete order simultaneously
  const handleConfirmPaymentAndComplete = async (order) => {
    if (!order) return;
    setCompletingWithPay(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          paid_amount: order.totalAmount,
          payment_status: 'Paid',
          order_status: 'Completed',
        })
        .eq('id', order.rawId);

      if (error) throw error;

      setOrders((prev) => prev.filter((o) => o.rawId !== order.rawId));
      setUnpaidOrderToComplete(null);
    } catch (error) {
      console.error('Error completing and marking order paid:', error.message);
      alert('Failed to complete order: ' + error.message);
    } finally {
      setCompletingWithPay(false);
    }
  };

  // Manager emergency override (explicit confirmation)
  const handleForceCompleteUnpaid = async (order) => {
    if (!order) return;
    const confirmed = window.confirm(
      `⚠️ WARNING: Are you sure you want to clear Order ${order.id} WITHOUT collecting payment of ₹${order.totalAmount.toFixed(2)}?\n\nThis will record the order as completed but UNPAID in sales and history.`
    );
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({ order_status: 'Completed' })
        .eq('id', order.rawId);

      if (error) throw error;

      setOrders((prev) => prev.filter((o) => o.rawId !== order.rawId));
      setUnpaidOrderToComplete(null);
    } catch (error) {
      console.error('Error completing order unpaid:', error.message);
      alert('Failed to update order: ' + error.message);
    }
  };

  // Execute Mark as Paid with audit metadata after staff confirmation
  const handleConfirmPaid = async () => {
    if (!confirmingPaymentOrder) return;
    setMarkingPaid(true);

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          paid_amount: confirmingPaymentOrder.totalAmount,
          payment_status: 'Paid',
        })
        .eq('id', confirmingPaymentOrder.rawId);

      if (error) throw error;

      setOrders((prev) =>
        prev.map((o) =>
          o.rawId === confirmingPaymentOrder.rawId ? { ...o, paymentStatus: 'PAID' } : o
        )
      );
      setConfirmingPaymentOrder(null);
    } catch (error) {
      console.error('Error updating payment status:', error.message);
      alert('Failed to update payment status: ' + error.message);
    } finally {
      setMarkingPaid(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (order) => {
    setEditingOrder(order);
    setEditTableNo(order.tableNo);
    setEditTotalAmount(order.totalAmount);
    setOriginalOrderTotal(order.totalAmount);
    setSelectedMenuItemId('');
    setItemQuantity(1);
  };

  // Auto-calculate total when selected item or quantity changes
  const handleMenuItemChange = (menuId, qty) => {
    setSelectedMenuItemId(menuId);
    if (!menuId) {
      setEditTotalAmount(originalOrderTotal);
      return;
    }
    const item = menuItems.find((m) => String(m.id) === String(menuId));
    if (item) {
      const addedCost = parseFloat(item.price) * parseInt(qty || 1);
      setEditTotalAmount((parseFloat(originalOrderTotal) + addedCost).toFixed(2));
    }
  };

  const handleQuantityChange = (qty) => {
    setItemQuantity(qty);
    if (!selectedMenuItemId) return;
    const item = menuItems.find((m) => String(m.id) === String(selectedMenuItemId));
    if (item) {
      const addedCost = parseFloat(item.price) * parseInt(qty || 1);
      setEditTotalAmount((parseFloat(originalOrderTotal) + addedCost).toFixed(2));
    }
  };

  // Save Changes & Add New Item to Order
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingOrder) return;

    try {
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          table_no: editTableNo,
          total_amount: parseFloat(editTotalAmount),
        })
        .eq('id', editingOrder.rawId);

      if (orderError) throw orderError;

      if (selectedMenuItemId) {
        const selectedItem = menuItems.find((m) => String(m.id) === String(selectedMenuItemId));
        const unitPrice = selectedItem ? selectedItem.price : 0;
        const { error: itemError } = await supabase.from('order_items').insert({
          order_id: editingOrder.rawId,
          menu_item_id: parseInt(selectedMenuItemId),
          quantity: parseInt(itemQuantity),
          unit_price: unitPrice,
        });

        if (itemError) throw itemError;
      }

      fetchLiveOrders();
      setEditingOrder(null);
    } catch (error) {
      console.error('Error updating order:', error.message);
      alert('Failed to update order: ' + error.message);
    }
  };

  const activeOrdersCount = orders.length;
  const pendingPaymentsCount = orders.filter((o) => (o.paymentStatus || '').toUpperCase() !== 'PAID').length;

  return (
    <div className="live-orders-page">
      <div className="page-header-row">
        <h2 className="admin-page-title">Real-Time Order Stack</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="live-sync-indicator">
            <span className="sync-dot"></span> Live Sync Active
          </div>
          <button
            type="button"
            className="admin-live-refresh-btn"
            onClick={() => fetchLiveOrders(false)}
            title="Refresh Orders Now"
            disabled={isRefreshing}
          >
            <RefreshCw size={14} className={isRefreshing ? 'spin-icon' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="live-orders-layout">
        <div className="queue-summary-box">
          <h3 className="summary-heading">QUEUE SUMMARY</h3>

          <div className="summary-card">
            <span className="summary-label">ACTIVE ORDERS</span>
            <span className="summary-number text-blue">
              {String(activeOrdersCount).padStart(2, '0')}
            </span>
          </div>

          <div className="summary-card">
            <span className="summary-label">PENDING PAYMENTS</span>
            <span className="summary-number text-orange">
              {String(pendingPaymentsCount).padStart(2, '0')}
            </span>
          </div>
        </div>

        <div className="orders-stack">
          {loading ? (
            <div className="no-orders-box">
              <p>🔄 Loading live orders from database...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="no-orders-box">
              <p>🎉 All orders have been completed and cleared!</p>
            </div>
          ) : (
            orders.map((order) => {
              const pStatusUpper = (order.paymentStatus || 'PENDING').toUpperCase();
              const isPendingPayment = pStatusUpper !== 'PAID';
              const isPartiallyPaid = pStatusUpper === 'PARTIALLY_PAID';
              const normStatus = (order.orderStatus || 'Pending').toLowerCase();
              const remainingBalance = Math.max(0, order.totalAmount - (order.paidAmount || 0));

              return (
                <div
                  key={order.rawId}
                  className={`order-card ${isPendingPayment ? 'highlight-pending' : ''}`}
                >
                  <div className="order-card-header">
                    <div className="order-meta-left">
                      <span className="order-id-badge">{order.id}</span>
                      <span className="order-timer">⏱️ {order.bookedTime}</span>
                      <span className="order-type-tag">
                        {order.orderType === 'dine-in'
                          ? `🍽️ Table ${order.tableNo}`
                          : `🛍️ Takeaway (${order.pickupTime || 'ASAP'})`}
                      </span>
                    </div>

                    <div className="order-badges-right">
                      {/* Kitchen Status Badge */}
                      <span className={`kitchen-status-pill status-${normStatus}`}>
                        {normStatus === 'ready' && '🔔 Ready'}
                        {normStatus === 'preparing' && '🍳 Cooking'}
                        {normStatus === 'accepted' && '✓ Accepted'}
                        {normStatus === 'pending' && '⏳ Pending'}
                      </span>

                      {/* Payment Status Badge */}
                      <div
                        className={`order-status-badge ${
                          isPendingPayment
                            ? isPartiallyPaid
                              ? 'badge-cash-pending'
                              : 'badge-cash-pending'
                            : 'badge-online-paid'
                        }`}
                        style={isPartiallyPaid ? { background: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D' } : {}}
                      >
                        {order.paymentMode} • {isPartiallyPaid ? `PARTIAL (Paid ₹${order.paidAmount})` : order.paymentStatus}
                      </div>
                    </div>
                  </div>

                  <div className="order-body">
                    {/* Customer info */}
                    <div className="order-customer-info">
                      <span>
                        <User size={13} style={{ verticalAlign: '-1px' }} />{' '}
                        <strong>{order.customerName}</strong>
                      </span>
                      {order.customerPhone && (
                        <span>
                          <Phone size={13} style={{ verticalAlign: '-1px' }} />{' '}
                          {order.customerPhone}
                        </span>
                      )}
                      {order.paymentReference && (
                        <span className="order-utr-tag">
                          Ref: <code>{order.paymentReference}</code>
                        </span>
                      )}
                    </div>

                    <p className="order-items-text">{order.items}</p>

                    <p className="order-total-text">
                      Total Amount: <strong>₹{order.totalAmount}</strong>
                      {isPartiallyPaid ? (
                        <span className="payment-pending-note" style={{ color: '#D97706', fontWeight: 600 }}>
                          {' '}(₹{order.paidAmount} paid online • ₹{remainingBalance.toFixed(2)} balance pending)
                        </span>
                      ) : isPendingPayment ? (
                        <span className="payment-pending-note">
                          {' '}(Payment pending counter collection)
                        </span>
                      ) : null}
                    </p>
                  </div>

                  {/* ACTION CONTROLS ROW */}
                  <div className="order-actions-row">
                    {/* 1. Sequential Food Prep Transitions */}
                    {normStatus === 'pending' && (
                      <button
                        className="btn-action btn-stage-advance"
                        onClick={() => handleUpdateOrderStatus(order.rawId, 'Accepted')}
                      >
                        ✓ Accept Order
                      </button>
                    )}
                    {normStatus === 'accepted' && (
                      <button
                        className="btn-action btn-stage-advance"
                        onClick={() => handleUpdateOrderStatus(order.rawId, 'Preparing')}
                      >
                        🍳 Start Cooking
                      </button>
                    )}
                    {normStatus === 'preparing' && (
                      <button
                        className="btn-action btn-stage-ready"
                        onClick={() => handleUpdateOrderStatus(order.rawId, 'Ready')}
                      >
                        🔔 Mark Ready to Serve
                      </button>
                    )}
                    {normStatus === 'ready' && (
                      <button
                        className={`btn-action btn-complete ${isPendingPayment ? 'btn-complete-pending' : ''}`}
                        onClick={() => handleCompleteOrderClick(order)}
                        title={
                          isPendingPayment
                            ? 'Payment pending: Confirm payment before completing'
                            : 'Complete and clear order'
                        }
                      >
                        {isPendingPayment ? '⚠️ Complete & Clear' : '✓ Complete & Clear'}
                      </button>
                    )}

                    {/* 2. Cash / Counter Payment Verification Button */}
                    {isPendingPayment && (
                      <button
                        className="btn-action btn-mark-paid"
                        onClick={() => setConfirmingPaymentOrder(order)}
                        title="Confirm received payment"
                      >
                        💵 Mark as Paid
                      </button>
                    )}

                    {/* 3. View / Print Bill */}
                    <button
                      className="btn-action btn-bill"
                      onClick={() => setViewingBillOrder(order.rawOrder)}
                    >
                      <Receipt size={14} style={{ verticalAlign: '-1px' }} /> Bill
                    </button>

                    {/* 4. Edit Order */}
                    <button className="btn-action btn-edit" onClick={() => openEditModal(order)}>
                      Edit
                    </button>

                    {/* 5. Cancel */}
                    <button
                      className="btn-action btn-cancel"
                      onClick={() => handleCancelOrder(order.rawId)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* CONFIRM MARK AS PAID MODAL POPUP */}
      {confirmingPaymentOrder && (
        <div className="admin-confirm-overlay">
          <div className="admin-confirm-modal">
            <div className="admin-confirm-header">
              <DollarSign size={24} className="text-orange" />
              <h3>Confirm Cash / UPI Payment</h3>
            </div>
            <div className="admin-confirm-body">
              <p>
                Have you physically received and verified payment for order{' '}
                <strong>{confirmingPaymentOrder.id}</strong>?
              </p>
              <div className="confirm-amount-callout">
                <span>Amount to Collect:</span>
                <strong>₹{confirmingPaymentOrder.totalAmount.toFixed(2)}</strong>
              </div>
              <p className="confirm-cust-meta">
                Customer: <strong>{confirmingPaymentOrder.customerName}</strong>
                {confirmingPaymentOrder.customerPhone && ` (${confirmingPaymentOrder.customerPhone})`}
              </p>
              {confirmingPaymentOrder.paymentReference && (
                <p className="confirm-cust-meta">
                  Customer UTR: <code>{confirmingPaymentOrder.paymentReference}</code>
                </p>
              )}
              <p className="confirm-warning">
                This action updates the customer's tracking screen to <strong>PAID</strong> in real-time.
              </p>
            </div>
            <div className="admin-confirm-actions">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setConfirmingPaymentOrder(null)}
                disabled={markingPaid}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-modal-confirm"
                onClick={handleConfirmPaid}
                disabled={markingPaid}
              >
                {markingPaid ? 'Saving...' : 'Yes, Payment Received'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UNPAID ORDER COMPLETE CONFIRMATION MODAL */}
      {unpaidOrderToComplete && (
        <div className="admin-confirm-overlay">
          <div className="admin-confirm-modal">
            <div className="admin-confirm-header">
              <AlertCircle size={26} className="text-amber" />
              <h3>Payment Collection Required</h3>
            </div>
            <div className="admin-confirm-body">
              <div className="confirm-unpaid-alert">
                <p>
                  <strong>⚠️ This order has not been marked as paid!</strong>
                  <br />
                  Clearing without collecting payment will record this order as unpaid.
                </p>
              </div>

              <div className="confirm-amount-callout">
                <span>Amount to Collect:</span>
                <strong>
                  ₹{Math.max(0, unpaidOrderToComplete.totalAmount - (unpaidOrderToComplete.paidAmount || 0)).toFixed(2)}
                </strong>
                {unpaidOrderToComplete.paidAmount > 0 && (
                  <div style={{ fontSize: '0.82rem', color: '#15803d', marginTop: '4px', fontWeight: 'bold' }}>
                    ✓ ₹{unpaidOrderToComplete.paidAmount.toFixed(2)} already settled online (Total Bill: ₹{unpaidOrderToComplete.totalAmount.toFixed(2)})
                  </div>
                )}
              </div>

              <p className="confirm-cust-meta">
                Order: <strong>{unpaidOrderToComplete.id}</strong>
              </p>
              <p className="confirm-cust-meta">
                Customer: <strong>{unpaidOrderToComplete.customerName}</strong>
                {unpaidOrderToComplete.customerPhone && ` (${unpaidOrderToComplete.customerPhone})`}
              </p>
              <p className="confirm-cust-meta">
                Location: <strong>{unpaidOrderToComplete.tableNo}</strong> • Mode:{' '}
                <strong>{unpaidOrderToComplete.paymentMode}</strong>
              </p>

              <p className="confirm-warning">
                Have you collected <strong>₹{Math.max(0, unpaidOrderToComplete.totalAmount - (unpaidOrderToComplete.paidAmount || 0)).toFixed(2)}</strong> from the customer?
              </p>
            </div>
            <div className="admin-confirm-actions" style={{ alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <button
                type="button"
                className="btn-modal-force-unpaid"
                onClick={() => handleForceCompleteUnpaid(unpaidOrderToComplete)}
                title="Override and complete order without recording payment"
              >
                Clear without paying
              </button>
              <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setUnpaidOrderToComplete(null)}
                  disabled={completingWithPay}
                >
                  Cancel (Keep in Queue)
                </button>
                <button
                  type="button"
                  className="btn-modal-confirm"
                  onClick={() => handleConfirmPaymentAndComplete(unpaidOrderToComplete)}
                  disabled={completingWithPay}
                >
                  {completingWithPay ? 'Saving...' : '✓ Mark Paid & Complete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW BILL MODAL POPUP */}
      {viewingBillOrder && (
        <OrderBillModal
          isOpen={Boolean(viewingBillOrder)}
          onClose={() => setViewingBillOrder(null)}
          order={viewingBillOrder}
        />
      )}

      {/* EDIT ORDER MODAL POPUP */}
      {editingOrder && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: '#FDFBFA',
              padding: 'clamp(16px, 4vw, 24px)',
              borderRadius: '16px',
              width: 'min(460px, 92vw)',
              boxShadow: '0 8px 24px rgba(61,39,29,0.2)',
              border: '1px solid #EFE9E1',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxSizing: 'border-box',
            }}
          >
            <h3
              style={{
                fontFamily: "'Luckiest Guy', cursive",
                color: '#3D271D',
                marginTop: 0,
                marginBottom: '16px',
              }}
            >
              Edit Order {editingOrder.id}
            </h3>

            <form onSubmit={handleSaveEdit}>
              <div style={{ marginBottom: '14px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    color: '#6B554B',
                    marginBottom: '6px',
                  }}
                >
                  Table Number
                </label>
                <input
                  type="text"
                  value={editTableNo}
                  onChange={(e) => setEditTableNo(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #EFE9E1',
                    background: '#F9F6F0',
                    boxSizing: 'border-box',
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    color: '#6B554B',
                    marginBottom: '6px',
                  }}
                >
                  Total Amount (₹){' '}
                  <span style={{ fontSize: '0.75rem', color: '#27ae60' }}>
                    (Updates automatically)
                  </span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editTotalAmount}
                  onChange={(e) => setEditTotalAmount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #EFE9E1',
                    background: '#F9F6F0',
                    boxSizing: 'border-box',
                    fontWeight: 'bold',
                    color: '#27ae60',
                  }}
                  required
                />
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #EFE9E1', margin: '16px 0' }} />

              <h4 style={{ color: '#3D271D', fontSize: '0.95rem', margin: '0 0 10px 0' }}>
                ➕ Add Menu Item from Database
              </h4>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <div style={{ flex: 2 }}>
                  <select
                    value={selectedMenuItemId}
                    onChange={(e) => handleMenuItemChange(e.target.value, itemQuantity)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid #EFE9E1',
                      background: '#F9F6F0',
                      boxSizing: 'border-box',
                      fontSize: '0.85rem',
                    }}
                  >
                    <option value="">-- Select dish --</option>
                    {menuItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} (₹{item.price})
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <input
                    type="number"
                    min="1"
                    value={itemQuantity}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    placeholder="Qty"
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid #EFE9E1',
                      background: '#F9F6F0',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #EFE9E1',
                    background: '#FFF',
                    color: '#6B554B',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#311E18',
                    color: '#FFD000',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                  }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}