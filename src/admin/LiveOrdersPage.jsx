import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './LiveOrdersPage.css';

export default function LiveOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State for Editing Modal
  const [editingOrder, setEditingOrder] = useState(null);
  const [editTableNo, setEditTableNo] = useState('');
  const [editTotalAmount, setEditTotalAmount] = useState('');
  
  // State for adding new items
  const [selectedMenuItemId, setSelectedMenuItemId] = useState('');
  const [itemQuantity, setItemQuantity] = useState(1);
  const [originalOrderTotal, setOriginalOrderTotal] = useState(0);

  useEffect(() => {
    fetchLiveOrders();
    fetchMenuItems();
  }, []);

  const fetchLiveOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            quantity,
            menu_items (
              name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const activeData = (data || []).filter(order => {
        const status = (order.order_status || '').toLowerCase();
        return status !== 'completed' && status !== 'delivered' && status !== 'cancelled';
      });

      const formattedOrders = activeData.map(order => {
        let itemsDescription = 'Café Order Items';
        if (order.order_items && order.order_items.length > 0) {
          itemsDescription = order.order_items.map(item => {
            const dishName = item.menu_items?.name || 'Item';
            return `${item.quantity}x ${dishName}`;
          }).join(', ');
        }

        return {
          id: `#${order.id}`,
          rawId: order.id,
          tableNo: order.table_no || 'Table 1',
          bookedTime: new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          items: itemsDescription,
          totalAmount: parseFloat(order.total_amount || 0),
          paymentMode: order.payment_mode ? order.payment_mode.toUpperCase() : 'ONLINE',
          paymentStatus: order.payment_status ? order.payment_status.toUpperCase() : 'PENDING',
          orderStatus: order.order_status || 'Pending'
        };
      });

      setOrders(formattedOrders);
    } catch (error) {
      console.error('Error fetching live orders:', error.message);
    } finally {
      setLoading(false);
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

  const handleCompleteOrder = async (rawId) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ order_status: 'Completed' })
        .eq('id', rawId);

      if (error) throw error;
      setOrders(orders.filter(order => order.rawId !== rawId));
    } catch (error) {
      console.error('Error completing order:', error.message);
      alert('Failed to complete order: ' + error.message);
    }
  };

  const handleMarkPaid = async (rawId) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ payment_status: 'Paid' })
        .eq('id', rawId);

      if (error) throw error;
      setOrders(orders.map(order => {
        if (order.rawId === rawId) {
          return { ...order, paymentStatus: 'PAID' };
        }
        return order;
      }));
    } catch (error) {
      console.error('Error updating payment status:', error.message);
      alert('Failed to update payment status: ' + error.message);
    }
  };

  const handleCancelOrder = async (rawId) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ order_status: 'Cancelled' })
        .eq('id', rawId);

      if (error) throw error;
      setOrders(orders.filter(order => order.rawId !== rawId));
    } catch (error) {
      console.error('Error cancelling order:', error.message);
      alert('Failed to cancel order: ' + error.message);
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
    const item = menuItems.find(m => String(m.id) === String(menuId));
    if (item) {
      const addedCost = parseFloat(item.price) * parseInt(qty || 1);
      setEditTotalAmount((parseFloat(originalOrderTotal) + addedCost).toFixed(2));
    }
  };

  const handleQuantityChange = (qty) => {
    setItemQuantity(qty);
    if (!selectedMenuItemId) return;
    const item = menuItems.find(m => String(m.id) === String(selectedMenuItemId));
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
          total_amount: parseFloat(editTotalAmount)
        })
        .eq('id', editingOrder.rawId);

      if (orderError) throw orderError;

      if (selectedMenuItemId) {
        const selectedItem = menuItems.find(m => String(m.id) === String(selectedMenuItemId));
        const unitPrice = selectedItem ? selectedItem.price : 0;

        const { error: itemError } = await supabase
          .from('order_items')
          .insert({
            order_id: editingOrder.rawId,
            menu_item_id: parseInt(selectedMenuItemId),
            quantity: parseInt(itemQuantity),
            unit_price: unitPrice
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
  const pendingPaymentsCount = orders.filter(o => o.paymentStatus === 'PENDING').length;

  return (
    <div className="live-orders-page">
      <div className="page-header-row">
        <h2 className="admin-page-title">Real-Time Order Stack</h2>
        <div className="live-sync-indicator">
          <span className="sync-dot"></span> Live Sync Active
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
              const isPendingPayment = order.paymentStatus === 'PENDING';
              return (
                <div 
                  key={order.rawId} 
                  className={`order-card ${isPendingPayment ? 'highlight-pending' : ''}`}
                >
                  <div className="order-card-header">
                    <div className="order-meta-left">
                      <span className="order-id-badge">{order.id}</span>
                      <span className="order-timer">⏱️ {order.bookedTime} ({order.tableNo})</span>
                    </div>
                    <div className={`order-status-badge ${isPendingPayment ? 'badge-cash-pending' : 'badge-online-paid'}`}>
                      {order.paymentMode} • {order.paymentStatus}
                    </div>
                  </div>

                  <div className="order-body">
                    <p className="order-items-text">{order.items}</p>
                    <p className="order-total-text">
                      Total Amount: <strong>₹{order.totalAmount}</strong>
                      {isPendingPayment && <span className="payment-pending-note"> (Payment pending collection)</span>}
                    </p>
                  </div>

                  <div className="order-actions-row">
                    {isPendingPayment && (
                      <>
                        <button className="btn-action btn-cancel" onClick={() => handleCancelOrder(order.rawId)}>
                          Cancel Order
                        </button>
                        <button className="btn-action btn-edit" onClick={() => openEditModal(order)}>
                          Edit Order
                        </button>
                        <button className="btn-action btn-mark-paid" onClick={() => handleMarkPaid(order.rawId)}>
                          Mark Paid & Ready
                        </button>
                      </>
                    )}
                    {!isPendingPayment && (
                      <>
                        <button className="btn-action btn-edit" onClick={() => openEditModal(order)}>
                          Edit Order
                        </button>
                        <button className="btn-action btn-complete" onClick={() => handleCompleteOrder(order.rawId)}>
                          Complete & Clear
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* EDIT ORDER MODAL POPUP */}
      {editingOrder && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{
            background: '#FDFBFA', padding: '24px', borderRadius: '16px', width: '460px',
            boxShadow: '0 8px 24px rgba(61,39,29,0.2)', border: '1px solid #EFE9E1', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <h3 style={{ fontFamily: "'Luckiest Guy', cursive", color: '#3D271D', marginTop: 0, marginBottom: '16px' }}>
              Edit Order {editingOrder.id}
            </h3>
            
            <form onSubmit={handleSaveEdit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#6B554B', marginBottom: '6px' }}>
                  Table Number
                </label>
                <input 
                  type="text" 
                  value={editTableNo} 
                  onChange={(e) => setEditTableNo(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #EFE9E1', background: '#F9F6F0', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#6B554B', marginBottom: '6px' }}>
                  Total Amount (₹) <span style={{ fontSize: '0.75rem', color: '#27ae60' }}>(Updates automatically)</span>
                </label>
                <input 
                  type="number" 
                  step="0.01"
                  value={editTotalAmount} 
                  onChange={(e) => setEditTotalAmount(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #EFE9E1', background: '#F9F6F0', boxSizing: 'border-box', fontWeight: 'bold', color: '#27ae60' }}
                  required
                />
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #EFE9E1', margin: '16px 0' }} />

              <h4 style={{ color: '#3D271D', fontSize: '0.95rem', margin: '0 0 10px 0' }}>➕ Add Menu Item from Database</h4>
              
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <div style={{ flex: 2 }}>
                  <select 
                    value={selectedMenuItemId} 
                    onChange={(e) => handleMenuItemChange(e.target.value, itemQuantity)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #EFE9E1', background: '#F9F6F0', boxSizing: 'border-box', fontSize: '0.85rem' }}
                  >
                    <option value="">-- Select dish --</option>
                    {menuItems.map(item => (
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
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #EFE9E1', background: '#F9F6F0', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setEditingOrder(null)}
                  style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #EFE9E1', background: '#FFF', color: '#6B554B', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#311E18', color: '#FFD000', cursor: 'pointer', fontWeight: 'bold' }}
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