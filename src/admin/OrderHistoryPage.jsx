import React, { useState } from 'react';
import './OrderHistoryPage.css';

const historicalOrdersData = [
  {
    id: '#ORD-099',
    tableNo: 'Table 1',
    date: '2026-09-21', // Today
    items: '1x Veg Loaded Burger, 1x Cold Cocoa',
    totalAmount: '₹349',
    paymentMode: 'ONLINE',
    status: 'Completed'
  },
  {
    id: '#ORD-098',
    tableNo: 'Table 3',
    date: '2026-09-20', // This week
    items: '2x White Sauce Pasta, 1x Garlic Bread',
    totalAmount: '₹580',
    paymentMode: 'CASH',
    status: 'Completed'
  },
  {
    id: '#ORD-095',
    tableNo: 'Table 5',
    date: '2026-09-15', // This week / month
    items: '1x Paneer Tikka Sandwich',
    totalAmount: '₹210',
    paymentMode: 'ONLINE',
    status: 'Cancelled'
  },
  {
    id: '#ORD-090',
    tableNo: 'Table 2',
    date: '2026-09-01', // This month
    items: '3x Chocolate Waffle, 2x KitKat Shake',
    totalAmount: '₹890',
    paymentMode: 'ONLINE',
    status: 'Completed'
  }
];

export default function OrderHistoryPage() {
  const [filter, setFilter] = useState('today');

  // Simple date filter logic for demonstration
  const filteredOrders = historicalOrdersData.filter(order => {
    if (filter === 'today') {
      return order.date === '2026-09-21';
    }
    if (filter === 'week') {
      // Mocking week filter range
      return order.date >= '2026-09-14';
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
        {filteredOrders.length === 0 ? (
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
                const isCompleted = order.status === 'Completed';
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