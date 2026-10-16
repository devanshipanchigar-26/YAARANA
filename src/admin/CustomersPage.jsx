import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './MenuManagementPage.css';
import './CustomersPage.css';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [customerTypeFilter, setCustomerTypeFilter] = useState('all'); // 'all' | 'regular' | 'new'
  
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);

  useEffect(() => {
    fetchCustomersWithStats();
  }, []);

  const fetchCustomersWithStats = async () => {
    setLoading(true);
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (userError) {
        console.error('Supabase users error:', userError.message);
      }

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('user_id, total_amount, id, created_at, order_status')
        .order('created_at', { ascending: false });

      if (orderError) {
        console.error('Supabase orders error:', orderError.message);
      }

      const usersList = userData || [];
      const ordersList = orderData || [];

      // O(M) single-pass lookup map for fast O(1) matching
      const ordersByUserId = {};
      for (const order of ordersList) {
        if (order.user_id) {
          if (!ordersByUserId[order.user_id]) {
            ordersByUserId[order.user_id] = [];
          }
          ordersByUserId[order.user_id].push(order);
        }
      }

      const enrichedCustomers = usersList.map(user => {
        const userOrders = ordersByUserId[user.id] || [];

        // Count only completed/delivered orders
        const completedOrders = userOrders.filter(o => {
          const status = (o.order_status || '').toLowerCase().trim();
          return status === 'completed' || status === 'delivered';
        });

        const completedOrdersCount = completedOrders.length;
        // Regular Customers: 5 or more completed orders; New Customers: 0–4 completed orders
        const customerType = completedOrdersCount >= 5 ? 'regular' : 'new';

        const totalSpend = userOrders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
        const completedSpend = completedOrders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);

        return {
          ...user,
          totalOrders: userOrders.length,
          completedOrdersCount,
          customerType,
          totalSpend,
          completedSpend,
          orders: userOrders
        };
      });

      setCustomers(enrichedCustomers);
    } catch (error) {
      console.error('Error in fetchCustomersWithStats:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewCustomer = (customer) => {
    setSelectedCustomer(customer);
    setCustomerOrders(customer.orders || []);
  };

  const filteredCustomers = customers.filter(customer => {
    const term = searchTerm.toLowerCase().trim();
    const nameMatch = customer.name ? customer.name.toLowerCase().includes(term) : false;
    const phoneMatch = customer.phone ? customer.phone.includes(term) : false;
    const emailMatch = customer.email ? customer.email.toLowerCase().includes(term) : false;
    
    const matchesSearch = term === '' || nameMatch || phoneMatch || emailMatch;
    const matchesRole = roleFilter === '' || (customer.role || 'customer') === roleFilter;
    const matchesType = customerTypeFilter === 'all' || customer.customerType === customerTypeFilter;

    return matchesSearch && matchesRole && matchesType;
  });

  const totalRegistered = customers.length;
  const regularCount = customers.filter(c => c.customerType === 'regular').length;
  const newCount = customers.filter(c => c.customerType === 'new').length;
  const totalRevenue = customers.reduce((acc, c) => acc + c.totalSpend, 0);

  const hasActiveFilters = searchTerm !== '' || roleFilter !== '' || customerTypeFilter !== 'all';

  const resetFilters = () => {
    setSearchTerm('');
    setRoleFilter('');
    setCustomerTypeFilter('all');
  };

  return (
    <div className="customers-admin-page">
      <div className="page-header-row">
        <h2 className="admin-page-title">Customer Directory & Analytics</h2>
      </div>

      {/* Summary Stat Cards */}
      <div className="customers-stats-grid">
        <div className="customer-stat-card">
          <p>Total Customers</p>
          <h3>{totalRegistered}</h3>
          <span className="stat-desc">Registered profiles</span>
        </div>
        <div className="customer-stat-card">
          <p>⭐ Regular Customers</p>
          <h3 style={{ color: '#D48B00' }}>{regularCount}</h3>
          <span className="stat-desc">&ge; 5 completed orders</span>
        </div>
        <div className="customer-stat-card">
          <p>🌱 New Customers</p>
          <h3 style={{ color: '#27AE60' }}>{newCount}</h3>
          <span className="stat-desc">&lt; 5 completed orders</span>
        </div>
        <div className="customer-stat-card">
          <p>Total Café Revenue</p>
          <h3>₹{totalRevenue.toFixed(2)}</h3>
          <span className="stat-desc">Lifetime order value</span>
        </div>
      </div>

      {/* Customer Type Filter Tabs */}
      <div className="customer-type-tabs-container">
        <button
          type="button"
          className={`customer-type-tab-btn ${customerTypeFilter === 'all' ? 'active' : ''}`}
          onClick={() => setCustomerTypeFilter('all')}
        >
          <span>All Customers</span>
          <span className="customer-type-badge-count">{totalRegistered}</span>
        </button>

        <button
          type="button"
          className={`customer-type-tab-btn ${customerTypeFilter === 'regular' ? 'active' : ''}`}
          onClick={() => setCustomerTypeFilter('regular')}
        >
          <span>⭐ Regular Customers</span>
          <span className="customer-type-badge-count">{regularCount}</span>
        </button>

        <button
          type="button"
          className={`customer-type-tab-btn ${customerTypeFilter === 'new' ? 'active' : ''}`}
          onClick={() => setCustomerTypeFilter('new')}
        >
          <span>🌱 New Customers</span>
          <span className="customer-type-badge-count">{newCount}</span>
        </button>
      </div>

      {/* Search & Role Filter Toolbar */}
      <div className="customer-filter-toolbar">
        <input 
          type="text"
          placeholder="🔍 Search by name, phone, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="customer-search-input"
        />
        <select 
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="customer-role-select"
        >
          <option value="">All Roles</option>
          <option value="customer">Customer</option>
          <option value="admin">Admin</option>
        </select>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            style={{
              background: '#FFF0F0',
              border: '1px solid #F9CCCC',
              color: '#D32F2F',
              padding: '10px 14px',
              borderRadius: '10px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Customers Table */}
      <div className="history-table-container">
        {loading ? (
          <div className="no-history-box"><p>Loading customer records...</p></div>
        ) : filteredCustomers.length === 0 ? (
          <div className="no-history-box">
            <p>No customers found matching the selected filters.</p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                style={{
                  marginTop: '10px',
                  background: '#311E18',
                  color: '#FFD000',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.85rem'
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <table className="history-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Customer Name</th>
                <th>Contact Info</th>
                <th>Customer Type</th>
                <th>Completed Orders</th>
                <th>Lifetime Spend</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer.id}>
                  <td>#{customer.id ? customer.id.slice(0, 8) + '...' : 'N/A'}</td>
                  <td><strong>{customer.name || 'Anonymous'}</strong></td>
                  <td>
                    <div style={{ fontSize: '0.85rem' }}>{customer.phone || 'No Phone'}</div>
                    <div style={{ fontSize: '0.75rem', color: '#888' }}>{customer.email || 'No Email'}</div>
                  </td>
                  <td>
                    <span className={`customer-type-badge ${customer.customerType}`}>
                      {customer.customerType === 'regular' ? '⭐ Regular' : '🌱 New'}
                    </span>
                  </td>
                  <td>
                    <strong>{customer.completedOrdersCount}</strong>
                    <span style={{ fontSize: '0.72rem', color: '#888', display: 'block' }}>
                      ({customer.totalOrders} total)
                    </span>
                  </td>
                  <td><strong>₹{customer.totalSpend.toFixed(2)}</strong></td>
                  <td>
                    <span className={`history-status-badge ${customer.role === 'admin' ? 'status-completed' : 'status-pending'}`}>
                      {customer.role || 'customer'}
                    </span>
                  </td>
                  <td>
                    <button 
                      onClick={() => handleViewCustomer(customer)}
                      style={{ backgroundColor: '#FFD000', color: '#311E18', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}
                    >
                      View Profile
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Customer Details Modal */}
      {selectedCustomer && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#FFF', padding: 'clamp(16px, 4vw, 28px)', borderRadius: '20px', width: 'min(550px, 94vw)', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', maxHeight: '85vh', overflowY: 'auto', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
              <div>
                <h3 style={{ fontFamily: "'Luckiest Guy', cursive", color: '#3D271D', fontSize: '1.5rem', margin: '0 0 4px 0' }}>
                  👤 {selectedCustomer.name || 'Anonymous'}
                </h3>
                <p style={{ margin: '2px 0', color: '#6B554B', fontSize: '0.88rem' }}>Phone: {selectedCustomer.phone || 'N/A'}</p>
                <p style={{ margin: '2px 0 12px 0', color: '#6B554B', fontSize: '0.88rem' }}>Email: {selectedCustomer.email || 'N/A'}</p>
              </div>
              <span className={`customer-type-badge ${selectedCustomer.customerType}`}>
                {selectedCustomer.customerType === 'regular' ? '⭐ Regular Customer' : '🌱 New Customer'}
              </span>
            </div>
            
            <div className="customer-type-modal-highlight">
              <span>Status:</span>
              <span>
                {selectedCustomer.customerType === 'regular'
                  ? `⭐ Regular Customer with ${selectedCustomer.completedOrdersCount} completed orders`
                  : `🌱 New Customer with ${selectedCustomer.completedOrdersCount} completed orders`}
              </span>
            </div>

            <div style={{ background: '#F9F6F0', padding: '12px 16px', borderRadius: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#888', display: 'block' }}>Completed Orders</span>
                <strong style={{ fontSize: '1.1rem', color: '#3D271D' }}>
                  {selectedCustomer.completedOrdersCount} / {selectedCustomer.totalOrders} total
                </strong>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', color: '#888', display: 'block' }}>Lifetime Value (LTV)</span>
                <strong style={{ fontSize: '1.1rem', color: '#27ae60' }}>₹{selectedCustomer.totalSpend.toFixed(2)}</strong>
              </div>
            </div>

            <h4 style={{ fontFamily: "'Luckiest Guy', cursive", color: '#3D271D', fontSize: '1.1rem', marginBottom: '10px' }}>Order History</h4>
            {customerOrders.length === 0 ? (
              <p style={{ fontSize: '0.9rem', color: '#888' }}>No past orders found for this customer.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {customerOrders.map(order => {
                  const isCompleted = (order.order_status || '').toLowerCase() === 'completed' || (order.order_status || '').toLowerCase() === 'delivered';
                  return (
                    <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: '#FDFBFA', borderRadius: '10px', border: '1px solid #EFE9E1', fontSize: '0.9rem' }}>
                      <div>
                        <strong>Order #{order.id}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#888' }}>{new Date(order.created_at).toLocaleString()}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <strong style={{ color: '#3D271D' }}>₹{order.total_amount}</strong>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: isCompleted ? '#27ae60' : '#e67e22' }}>
                          {order.order_status || 'Pending'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button 
              onClick={() => setSelectedCustomer(null)}
              style={{ width: '100%', marginTop: '24px', backgroundColor: '#311E18', color: '#FFD000', border: 'none', padding: '12px', borderRadius: '12px', fontFamily: "'Luckiest Guy', cursive", cursor: 'pointer', fontSize: '1rem' }}
            >
              Close Profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
}