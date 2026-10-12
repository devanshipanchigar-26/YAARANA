import React from 'react';
import { X } from 'lucide-react';

export default function AdminSidebar({
  activeTab,
  setActiveTab,
  isOpen = false,
  onClose,
  onBackToWebsite,
}) {
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

  const handleNavClick = (id) => {
    setActiveTab(id);
    if (onClose) onClose();
  };

  return (
    <aside className={`admin-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-logo-area">
        <div className="sidebar-logo-badge">YAARANA</div>
        {onClose && (
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`sidebar-link ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => handleNavClick(item.id)}
          >
            <span className="sidebar-icon">{item.icon}</span> {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom-group">
        {onBackToWebsite && (
          <button
            type="button"
            className="sidebar-back-website-btn"
            onClick={() => {
              if (onClose) onClose();
              onBackToWebsite();
            }}
          >
            ← Back to Website
          </button>
        )}

        <div className="sidebar-user-footer">
          <div className="user-avatar">A</div>
          <div className="user-info">
            <span className="user-name">Admin User</span>
            <span className="user-logout">Logout</span>
          </div>
        </div>
      </div>
    </aside>
  );
}