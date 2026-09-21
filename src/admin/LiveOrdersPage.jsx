import React, { useState } from 'react';
import './LiveOrdersPage.css';

const initialOrders = [
  {
    id: '#ORD-101',
    tableNo: 'Table 2',
    bookedTime: 'Booked 38 mins ago',
    items: '2x Hazelnut Cold Coffee, 1x Loaded Cheese Fries',
    totalAmount: '₹627',
    paymentMode: 'ONLINE',
    paymentStatus: 'PAID'
  },
  {
    id: '#ORD-104',
    tableNo: 'Table 4',
    bookedTime: 'Booked 4 mins ago (Just Arrived)',
    items: '1x Classic Chocolate Waffle, 2x Paneer Tikka Burger',
    totalAmount: '₹627',
    paymentMode: 'CASH',
    paymentStatus: 'PENDING'
  }
];

export default function LiveOrdersPage() {
  const [orders, setOrders] = useState(initialOrders);

  const handleCompleteOrder = (id) => {
    setOrders(orders.filter(order => order.id !== id));
  };

  const handleMarkPaid = (id) => {
    setOrders(orders.map(order => {
      if (order.id === id) {
        return { ...order, paymentStatus: 'PAID' };
      }
      return order;
    }));
  };

  const handleCancelOrder = (id) => {
    setOrders(orders.filter(order => order.id !== id));
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
          {orders.length === 0 ? (
            <div className="no-orders-box">
              <p>🎉 All orders have been completed and cleared!</p>
            </div>
          ) : (
            orders.map((order) => {
              const isPendingPayment = order.paymentStatus === 'PENDING';
              return (
                <div 
                  key={order.id} 
                  className={`order-card ${isPendingPayment ? 'highlight-pending' : ''}`}
                >
                  <div className="order-card-header">
                    <div className="order-meta-left">
                      <span className="order-id-badge">{order.id}</span>
                      <span className="order-timer">⏱️ {order.bookedTime}</span>
                    </div>
                    <div className={`order-status-badge ${isPendingPayment ? 'badge-cash-pending' : 'badge-online-paid'}`}>
                      {order.paymentMode} • {order.paymentStatus}
                    </div>
                  </div>

                  <div className="order-body">
                    <p className="order-items-text">{order.items}</p>
                    <p className="order-total-text">
                      Total Amount: <strong>{order.totalAmount}</strong>
                      {isPendingPayment && <span className="payment-pending-note"> (Payment pending collection)</span>}
                    </p>
                  </div>

                  <div className="order-actions-row">
                    {isPendingPayment && (
                      <>
                        <button className="btn-action btn-cancel" onClick={() => handleCancelOrder(order.id)}>
                          Cancel Order
                        </button>
                        <button className="btn-action btn-edit">
                          Edit Order
                        </button>
                        <button className="btn-action btn-mark-paid" onClick={() => handleMarkPaid(order.id)}>
                          Mark Paid & Ready
                        </button>
                      </>
                    )}
                    {!isPendingPayment && (
                      <>
                        <button className="btn-action btn-edit">
                          Edit Order
                        </button>
                        <button className="btn-action btn-complete" onClick={() => handleCompleteOrder(order.id)}>
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
    </div>
  );
}