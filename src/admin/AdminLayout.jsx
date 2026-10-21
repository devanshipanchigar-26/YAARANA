import React, { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import AdminSidebar from './AdminSidebar';
import './AdminLayout.css';

export default function AdminLayout({ children, activeTab, setActiveTab, onBackToWebsite }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 850) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const tabLabels = {
    'live-orders': 'Live Orders',
    'order-history': 'Order History',
    'table-bookings': 'Table Bookings',
    'tables-qr': 'Tables & QR Codes',
    'menu-management': 'Menu Management',
    'specials': 'Specials Management',
    'customers': 'Customers',
    'messages': 'Customer Messages & Inquiries',
    'sales': 'Sales Statistics',
    'sales-statistics': 'Sales Statistics',
    'sales-stats': 'Sales Statistics',
    'reviews': 'Reviews & Ratings',
    'settings': 'Settings',
  };

  return (
    <div className="admin-container">
      {/* Mobile Top Header (only visible on <= 850px) */}
      <header className="admin-mobile-topbar">
        <button
          type="button"
          className="admin-mobile-menu-btn"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu size={22} />
        </button>

        <span className="admin-mobile-tab-title">
          {tabLabels[activeTab] || 'Admin Panel'}
        </span>

        <div className="sidebar-logo-badge admin-mobile-logo">YAARANA</div>
      </header>

      {/* Backdrop overlay for mobile drawer */}
      <div
        className={`admin-sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Reusable Sidebar Component */}
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onBackToWebsite={onBackToWebsite}
      />

      {/* Main Content Area */}
      <main className="admin-main-content">
        {children}
      </main>
    </div>
  );
}