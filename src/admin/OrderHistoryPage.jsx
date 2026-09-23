import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './OrderHistoryPage.css';

export default function OrderHistoryPage() {
  const [filter, setFilter] = useState('all');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistoryOrders();
  }, []);

  const fetchHistoryOrders = async () => {
    setLoading(true);
    try {
      // Fetch orders along with their related order items and menu item details
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

      const formatted = (data || []).map(order => {
        const orderDateObj = new Date(order.created_at);

        // Build items string from joined tables
        let itemsDescription = 'Café Order Items';
        if (order.order_items && order.order_items.length > 0) {
          itemsDescription = order.order_items.map(item => {
            const dishName = item.menu_items?.name || 'Item';
            return `${item.quantity}x ${dishName}`;
          }).join(', ');
        }

        return {
          id: `#${order.id}`,
          tableNo: order.table_no || 'Table 1',
          date: orderDateObj.toISOString().split('T')[0], // YYYY-MM-DD
          rawDate: orderDateObj,
          items: itemsDescription,
          totalAmount: `₹${order.total_amount || 0}`,
          paymentMode: order.payment_mode ? order.payment_mode.toUpperCase() : 'ONLINE',
          status: order.order_status || 'Completed'
        };
      });

      setOrders(formatted);
    } catch (error) {
      console.error('Error fetching order history:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const todayStr = '2026-09-23';
    if (filter === 'today') {
      return order.date === todayStr;
    }
    if (filter === 'week') {
      const orderTime = order.rawDate.getTime();
      const oneWeekAgo = new Date('2026-09-16').getTime();
      return orderTime >= oneWeekAgo;
    }
    if (filter === 'month') {
      return order.date.startsWith('2026-09');
    }
    return true; // 'all'
  });

  return (
    <div className="order-history-page">
      <div className="page-header-row">
        <h2 className="admin-page-title">Order History Archive</h2>
        
        {/* Filter Tabs */}
        <div className="history-filter-tabs">
          <button 
            className={`filter-tab ${filter === 'today' ? 'active' : ''}`}
            onClick={() => setFilter('today')}
          >
            Today's Orders
          </button>
          <button 
            className={`filter-tab ${filter === 'week' ? 'active' : ''}`}
            onClick={() => setFilter('week')}
          >
            This Week
          </button>
          <button 
            className={`filter-tab ${filter === 'month' ? 'active' : ''}`}
            onClick={() => setFilter('month')}
          >
            This Month
          </button>
          <button 
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Time
          </button>
        </div>
      </div>

      {/* Orders Table Container */}
      <div className="history-table-container">
        {loading ? (
          <div className="no-history-box">
            <p>🔄 Loading order history from database...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="no-history-box">
            <p>📭 No orders found for this time period.</p>
          </div>
        ) : (
          <table className="history-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Table</th>
                <th>Date & Time</th>
                <th>Items Ordered</th>
                <th>Total</th>
                <th>Mode</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const statusLower = order.status.toLowerCase();
                const isCompleted = statusLower === 'completed' || statusLower === 'delivered';
                return (
                  <tr key={order.id}>
                    <td><span className="history-id-badge">{order.id}</span></td>
                    <td>{order.tableNo}</td>
                    <td className="history-date">{order.date}</td>
                    <td className="history-items-cell">{order.items}</td>
                    <td><strong>{order.totalAmount}</strong></td>
                    <td>{order.paymentMode}</td>
                    <td>
                      <span className={`history-status-badge ${isCompleted ? 'status-completed' : 'status-cancelled'}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}