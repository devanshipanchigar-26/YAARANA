import React from 'react';

export default function AdminSidebar({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'live-orders', label: 'Live Orders', icon: '🔥' },
    { id: 'order-history', label: 'Order History', icon: '📦' },
    { id: 'menu-management', label: 'Menu Management', icon: '🍔' },
    { id: 'customers', label: 'Customers', icon: '👥' },
    { id: 'sales', label: 'Sales Statistics', icon: '📊' },
    { id: 'reviews', label: 'Reviews & Ratings', icon: '⭐' },
    { id: 'inventory', label: 'Inventory Status', icon: '📦' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <aside className="admin-sidebar">
      <div className="sidebar-logo-area">
        <div className="sidebar-logo-badge">YAARANA</div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button 
            key={item.id}
            className={`sidebar-link ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            <span className="sidebar-icon">{item.icon}</span> {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-user-footer">
        <div className="user-avatar">A</div>
        <div className="user-info">
          <span className="user-name">Admin User</span>
          <span className="user-logout">Logout</span>
        </div>
      </div>
    </aside>
  );
}