import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './MenuManagementPage.css';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  
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
        .select('*');

      if (userError) {
        console.error('Supabase users error:', userError.message);
      }

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('user_id, total_amount, id, created_at, status');

      if (orderError) {
        console.error('Supabase orders error:', orderError.message);
      }

      const usersList = userData || [];
      const ordersList = orderData || [];

      const enrichedCustomers = usersList.map(user => {
        const userOrders = ordersList.filter(o => o.user_id === user.id);
        const totalSpend = userOrders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
        return {
          ...user,
          totalOrders: userOrders.length,
          totalSpend: totalSpend,
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
    const term = searchTerm.toLowerCase();
    const nameMatch = customer.name ? customer.name.toLowerCase().includes(term) : false;
    const phoneMatch = customer.phone ? customer.phone.includes(term) : false;
    const emailMatch = customer.email ? customer.email.toLowerCase().includes(term) : false;
    
    const matchesSearch = nameMatch || phoneMatch || emailMatch || term === '';
    const matchesRole = roleFilter === '' || (customer.role || 'customer') === roleFilter;

    return matchesSearch && matchesRole;
  });

  const totalRegistered = customers.length;
  const totalRevenue = customers.reduce((acc, c) => acc + c.totalSpend, 0);
  const activeVIPs = customers.filter(c => c.totalSpend > 500 || c.role === 'admin').length;

  return (
    <div className="menu-management-page">
      <div className="page-header-row">
        <h2 className="admin-page-title">Customer Directory & Analytics</h2>
      </div>

      {/* Summary Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '10px' }}>
        <div style={{ background: '#FDFBFA', border: '1px solid #EFE9E1', borderRadius: '16px', padding: '18px', boxShadow: '0 4px 12px rgba(61, 39, 29, 0.03)' }}>
          <p style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: '#6B554B', fontWeight: 'bold' }}>TOTAL CUSTOMERS</p>
          <h3 style={{ margin: 0, fontSize: '1.8rem', color: '#3D271D', fontFamily: "'Luckiest Guy', cursive" }}>{totalRegistered}</h3>
        </div>
        <div style={{ background: '#FDFBFA', border: '1px solid #EFE9E1', borderRadius: '16px', padding: '18px', boxShadow: '0 4px 12px rgba(61, 39, 29, 0.03)' }}>
          <p style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: '#6B554B', fontWeight: 'bold' }}>VIP & ACTIVE USERS</p>
          <h3 style={{ margin: 0, fontSize: '1.8rem', color: '#3D271D', fontFamily: "'Luckiest Guy', cursive" }}>{activeVIPs}</h3>
        </div>
        <div style={{ background: '#FDFBFA', border: '1px solid #EFE9E1', borderRadius: '16px', padding: '18px', boxShadow: '0 4px 12px rgba(61, 39, 29, 0.03)' }}>
          <p style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: '#6B554B', fontWeight: 'bold' }}>TOTAL CAFÉ REVENUE</p>
          <h3 style={{ margin: 0, fontSize: '1.8rem', color: '#3D271D', fontFamily: "'Luckiest Guy', cursive" }}>₹{totalRevenue.toFixed(2)}</h3>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: '#FDFBFA', padding: '14px 20px', borderRadius: '16px', border: '1px solid #EFE9E1' }}>
        <input 
          type="text"
          placeholder="🔍 Search by name, phone, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: '1px solid #EFE9E1', background: '#F9F6F0', fontSize: '0.9rem', color: '#3D271D', outline: 'none' }}
        />
        <select 
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #EFE9E1', background: '#F9F6F0', fontSize: '0.9rem', color: '#3D271D', outline: 'none', minWidth: '160px' }}
        >
          <option value="">All Roles</option>
          <option value="customer">Customer</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {/* Customers Table */}
      <div className="history-table-container">
        {loading ? (
          <div className="no-history-box"><p>Loading customer records...</p></div>
        ) : filteredCustomers.length === 0 ? (
          <div className="no-history-box">
            <p>No customers found matching your filter.</p>
          </div>
        ) : (
          <table className="history-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Customer Name</th>
                <th>Contact Info</th>
                <th>Total Orders</th>
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
                  <td>{customer.totalOrders} orders</td>
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
          <div style={{ background: '#FFF', padding: '30px', borderRadius: '20px', width: '90%', maxWidth: '550px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', maxHeight: '80vh', overflowY: 'auto' }}>
            <h3 style={{ fontFamily: "'Luckiest Guy', cursive", color: '#3D271D', fontSize: '1.5rem', margin: '0 0 10px 0' }}>
              👤 {selectedCustomer.name || 'Anonymous'}
            </h3>
            <p style={{ margin: '4px 0', color: '#6B554B', fontSize: '0.9rem' }}>Phone: {selectedCustomer.phone || 'N/A'}</p>
            <p style={{ margin: '4px 0 16px 0', color: '#6B554B', fontSize: '0.9rem' }}>Email: {selectedCustomer.email || 'N/A'}</p>
            
            <div style={{ background: '#F9F6F0', padding: '12px 16px', borderRadius: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#888', display: 'block' }}>Total Orders</span>
                <strong style={{ fontSize: '1.1rem', color: '#3D271D' }}>{selectedCustomer.totalOrders}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#888', display: 'block' }}>Lifetime Value (LTV)</span>
                <strong style={{ fontSize: '1.1rem', color: '#27ae60' }}>₹{selectedCustomer.totalSpend.toFixed(2)}</strong>
              </div>
            </div>

            <h4 style={{ fontFamily: "'Luckiest Guy', cursive", color: '#3D271D', fontSize: '1.1rem', marginBottom: '10px' }}>Order History</h4>
            {customerOrders.length === 0 ? (
              <p style={{ fontSize: '0.9rem', color: '#888' }}>No past orders found for this customer.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {customerOrders.map(order => (
                  <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#FDFBFA', borderRadius: '8px', border: '1px solid #EFE9E1', fontSize: '0.9rem' }}>
                    <div>
                      <strong>Order #{order.id}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#888' }}>{new Date(order.created_at).toLocaleString()}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <strong style={{ color: '#3D271D' }}>₹{order.total_amount}</strong>
                      <div style={{ fontSize: '0.75rem', color: order.status === 'completed' ? '#27ae60' : '#e67e22' }}>{order.status}</div>
                    </div>
                  </div>
                ))}
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