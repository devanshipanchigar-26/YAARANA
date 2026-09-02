import React from 'react';
import './AdminHeader.css';

export default function AdminHeader({ title, notificationCount = 3 }) {
  return (
    <header className="admin-top-header">
      <h2 className="admin-header-title">{title}</h2>
      
      <div className="admin-header-right">
        <div className="live-sync-indicator">
          <span className="sync-dot"></span> Live Queue Active
        </div>
        
        <button className="notification-bell-btn">
          🔔 <span className="notification-badge">{notificationCount}</span>
        </button>
      </div>
    </header>
  );
}