import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import './MenuManagementPage.css';

export default function SalesStatisticsPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRange, setFilterRange] = useState('all');

  useEffect(() => {
    fetchSalesData();
  }, []);

  const fetchSalesData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            quantity,
            unit_price,
            menu_items (
              name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching sales statistics:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter orders based on selected time range
  const filteredOrders = orders.filter(order => {
    const orderDate = new Date(order.created_at);
    const today = new Date('2026-09-23'); // Reference date
    
    if (filterRange === 'today') {
      return orderDate.toDateString() === today.toDateString();
    }
    if (filterRange === 'week') {
      const oneWeekAgo = new Date(today);
      oneWeekAgo.setDate(today.getDate() - 7);
      return orderDate >= oneWeekAgo;
    }
    if (filterRange === 'month') {
      return orderDate.getMonth() === today.getMonth() && orderDate.getFullYear() === today.getFullYear();
    }
    return true; // 'all'
  });

  // Calculate Metrics
  const totalOrdersCount = filteredOrders.length;
  const validRevenueOrders = filteredOrders.filter(o => {
    const status = (o.order_status || '').toLowerCase();
    const pStatus = (o.payment_status || '').toLowerCase();
    return status === 'completed' || status === 'delivered' || pStatus === 'paid' || true; 
  });
  
  const totalRevenue = validRevenueOrders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
  const averageOrderValue = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0;

  // --- GRAPH DATA PREPARATION ---

  // 1. Revenue over time (Grouped by Date)
  const revenueByDate = {};
  [...validRevenueOrders].reverse().forEach(order => { // Reverse to go chronological
    const dateStr = new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    revenueByDate[dateStr] = (revenueByDate[dateStr] || 0) + (parseFloat(order.total_amount) || 0);
  });
  
  const barChartData = Object.keys(revenueByDate).map(date => ({
    date,
    Revenue: revenueByDate[date]
  }));

  // 2. Payment Modes split
  const paymentModes = {};
  filteredOrders.forEach(order => {
    const mode = (order.payment_mode || 'Online').toUpperCase();
    paymentModes[mode] = (paymentModes[mode] || 0) + 1;
  });
  
  const pieChartData = Object.keys(paymentModes).map(name => ({
    name,
    value: paymentModes[name]
  }));
  const PIE_COLORS = ['#FFD000', '#27ae60', '#e67e22', '#3D271D'];

  // Calculate top selling items
  const itemCounts = {};
  filteredOrders.forEach(order => {
    if (order.order_items) {
      order.order_items.forEach(item => {
        const name = item.menu_items?.name || 'Café Item';
        itemCounts[name] = (itemCounts[name] || 0) + (item.quantity || 1);
      });
    }
  });

  const topItems = Object.entries(itemCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const exportCSV = () => {
    const csvHeader = "Order ID,Date,Table,Status,Payment Mode,Total Amount\n";
    const csvRows = filteredOrders.map(o => 
      `"${o.id}","${new Date(o.created_at).toLocaleString()}","${o.table_no || 'N/A'}","${o.order_status || 'Pending'}","${o.payment_mode || 'Online'}","${o.total_amount}"`
    ).join("\n");
    
    const blob = new Blob([csvHeader + csvRows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yaarana-sales-report-${filterRange}.csv`;
    a.click();
  };

  return (
    <div className="menu-management-page">
      <div className="page-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <h2 className="admin-page-title" style={{ fontFamily: "'Luckiest Guy', cursive", color: '#3D271D', fontSize: '2rem', margin: 0 }}>
          📊 Sales Analytics
        </h2>
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ display: 'flex', background: '#FDFBFA', padding: '4px', borderRadius: '12px', border: '1px solid #EFE9E1' }}>
            {['today', 'week', 'month', 'all'].map((range) => (
              <button
                key={range}
                onClick={() => setFilterRange(range)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: filterRange === range ? '#311E18' : 'transparent',
                  color: filterRange === range ? '#FFD000' : '#6B554B',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  textTransform: 'capitalize'
                }}
              >
                {range === 'all' ? 'All Time' : range}
              </button>
            ))}
          </div>

          <button 
            onClick={exportCSV}
            style={{ backgroundColor: '#27ae60', color: '#FFF', border: 'none', padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', margin: '20px 0' }}>
        <div style={{ background: '#FDFBFA', border: '1px solid #EFE9E1', borderRadius: '16px', padding: '18px', boxShadow: '0 4px 12px rgba(61, 39, 29, 0.03)' }}>
          <p style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: '#6B554B', fontWeight: 'bold' }}>TOTAL REVENUE</p>
          <h3 style={{ margin: 0, fontSize: '1.8rem', color: '#27ae60', fontFamily: "'Luckiest Guy', cursive" }}>₹{totalRevenue.toFixed(2)}</h3>
        </div>
        <div style={{ background: '#FDFBFA', border: '1px solid #EFE9E1', borderRadius: '16px', padding: '18px', boxShadow: '0 4px 12px rgba(61, 39, 29, 0.03)' }}>
          <p style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: '#6B554B', fontWeight: 'bold' }}>TOTAL ORDERS</p>
          <h3 style={{ margin: 0, fontSize: '1.8rem', color: '#3D271D', fontFamily: "'Luckiest Guy', cursive" }}>{totalOrdersCount}</h3>
        </div>
        <div style={{ background: '#FDFBFA', border: '1px solid #EFE9E1', borderRadius: '16px', padding: '18px', boxShadow: '0 4px 12px rgba(61, 39, 29, 0.03)' }}>
          <p style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: '#6B554B', fontWeight: 'bold' }}>AVG. ORDER VALUE</p>
          <h3 style={{ margin: 0, fontSize: '1.8rem', color: '#3D271D', fontFamily: "'Luckiest Guy', cursive" }}>₹{averageOrderValue.toFixed(2)}</h3>
        </div>
      </div>

      {/* GRAPHS SECTION */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px', marginBottom: '20px' }}>
        
        {/* Bar Chart: Revenue Over Time */}
        <div style={{ background: '#FDFBFA', border: '1px solid #EFE9E1', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 12px rgba(61, 39, 29, 0.03)', height: '300px' }}>
          <h3 style={{ fontFamily: "'Luckiest Guy', cursive", color: '#3D271D', fontSize: '1.1rem', margin: '0 0 16px 0' }}>📈 Revenue Timeline</h3>
          {barChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EFE9E1" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B554B' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B554B' }} tickFormatter={(value) => `₹${value}`} />
                <RechartsTooltip cursor={{fill: '#F9F6F0'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="Revenue" fill="#FFD000" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: '#888', fontSize: '0.9rem', textAlign: 'center', marginTop: '40px' }}>No revenue data for this period.</p>
          )}
        </div>

        {/* Pie Chart: Payment Modes */}
        <div style={{ background: '#FDFBFA', border: '1px solid #EFE9E1', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 12px rgba(61, 39, 29, 0.03)', height: '300px' }}>
          <h3 style={{ fontFamily: "'Luckiest Guy', cursive", color: '#3D271D', fontSize: '1.1rem', margin: '0 0 16px 0' }}>💳 Payment Preferences</h3>
          {pieChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieChartData} cx="50%" cy="45%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#6B554B' }}/>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: '#888', fontSize: '0.9rem', textAlign: 'center', marginTop: '40px' }}>No payment data available.</p>
          )}
        </div>
      </div>

      {/* Top Selling Items */}
      <div style={{ background: '#FDFBFA', border: '1px solid #EFE9E1', borderRadius: '16px', padding: '20px', marginBottom: '20px', boxShadow: '0 4px 12px rgba(61, 39, 29, 0.03)' }}>
        <h3 style={{ fontFamily: "'Luckiest Guy', cursive", color: '#3D271D', fontSize: '1.2rem', margin: '0 0 12px 0' }}>🔥 Top Selling Menu Items</h3>
        {topItems.length === 0 ? (
          <p style={{ color: '#888', fontSize: '0.9rem', margin: 0 }}>No item sales recorded for this period.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            {topItems.map(([name, count], index) => (
              <div key={name} style={{ background: '#F9F6F0', padding: '12px', borderRadius: '12px', border: '1px solid #EFE9E1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: '#3D271D', fontWeight: 'bold' }}>{index + 1}. {name}</span>
                <span style={{ background: '#311E18', color: '#FFD000', padding: '2px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold' }}>{count} sold</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Transactions Table */}
      <div className="history-table-container">
        <h3 style={{ fontFamily: "'Luckiest Guy', cursive", color: '#3D271D', fontSize: '1.2rem', marginBottom: '14px' }}>Recent Sales Transactions</h3>
        {loading ? (
          <div className="no-history-box"><p>Loading sales statistics...</p></div>
        ) : filteredOrders.length === 0 ? (
          <div className="no-history-box">
            <p>No sales transactions found for this time filter.</p>
          </div>
        ) : (
          <table className="history-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Date & Time</th>
                <th>Table</th>
                <th>Status</th>
                <th>Payment Mode</th>
                <th>Total Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const status = (order.order_status || 'Pending');
                const isCompleted = status.toLowerCase() === 'completed' || status.toLowerCase() === 'delivered';
                return (
                  <tr key={order.id}>
                    <td><strong style={{ color: '#3D271D' }}>#{order.id}</strong></td>
                    <td className="history-date">{new Date(order.created_at).toLocaleString()}</td>
                    <td>
                      <span style={{ background: '#F9F6F0', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', color: '#6B554B' }}>
                        {order.table_no || 'Table 1'}
                      </span>
                    </td>
                    <td>
                      <span className={`history-status-badge ${isCompleted ? 'status-completed' : 'status-pending'}`}>
                        {status}
                      </span>
                    </td>
                    <td>{order.payment_mode || 'Online / UPI'}</td>
                    <td><strong style={{ color: '#27ae60' }}>₹{parseFloat(order.total_amount || 0).toFixed(2)}</strong></td>
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