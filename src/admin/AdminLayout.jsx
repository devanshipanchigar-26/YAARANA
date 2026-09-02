import React from 'react';
import AdminSidebar from './AdminSidebar';
import './AdminLayout.css';

export default function AdminLayout({ children, activeTab, setActiveTab }) {
  return (
    <div className="admin-container">
      {/* Reusable Sidebar Component */}
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="admin-main-content">
        {children}
      </main>
    </div>
  );
}