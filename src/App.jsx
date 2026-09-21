import React, { useState } from 'react';
import Navbar from './Components/Navbar';
import HomePage from './Pages/HomePage';
import Cart from './Cart/Cart';
import AdminLayout from './admin/AdminLayout';
import LiveOrdersPage from './admin/LiveOrdersPage';
import OrderHistoryPage from './admin/OrderHistoryPage';
import MenuManagementPage from './admin/MenuManagementPage';
import './App.css';

export default function App() {
  // Toggle between 'website' and 'admin' views
  const [currentView, setCurrentView] = useState('admin'); 
  const [activeAdminTab, setActiveAdminTab] = useState('menu-management');

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(2);
  const [cartItems, setCartItems] = useState([
    { id: 1, name: 'Hazelnut Cold Coffee', price: 199, quantity: 1, emoji: '☕' },
    { id: 2, name: 'Loaded Cheese Fries', price: 229, quantity: 1, emoji: '🍟' }
  ]);

  // If view mode is admin, render the admin dashboard layout
  if (currentView === 'admin') {
    return (
      <div className="app-root">
        <AdminLayout activeTab={activeAdminTab} setActiveTab={setActiveAdminTab}>
          {activeAdminTab === 'live-orders' && <LiveOrdersPage />}
          {activeAdminTab === 'order-history' && <OrderHistoryPage />}
          {activeAdminTab === 'menu-management' && <MenuManagementPage />}

          {/* Fallback for other tabs under development */}
          {activeAdminTab !== 'live-orders' && 
           activeAdminTab !== 'order-history' && 
           activeAdminTab !== 'menu-management' && (
            <div>
              <h2 style={{ fontFamily: "'Luckiest Guy', cursive", color: '#3D271D', fontSize: '2.2rem' }}>
                {activeAdminTab.replace('-', ' ').toUpperCase()}
              </h2>
              <p style={{ color: '#6B554B' }}>This module is currently under development...</p>
            </div>
          )}

          {/* Button to go back to customer website */}
          <div style={{ marginTop: '40px', borderTop: '1px solid #EFE9E1', paddingTop: '20px' }}>
            <button 
              onClick={() => setCurrentView('website')}
              style={{
                backgroundColor: '#311E18',
                color: '#FFD000',
                fontFamily: "'Luckiest Guy', cursive",
                padding: '10px 20px',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              ← Back to Customer Website
            </button>
          </div>
        </AdminLayout>
      </div>
    );
  }

  // Otherwise, render the main customer-facing website
  return (
    <div className="app">
      <Navbar 
        onCartClick={() => setIsCartOpen(true)} 
        cartItemCount={cartItemCount} 
      />
      
      <HomePage />

      {/* Floating Button to open Admin Panel for testing */}
      <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 997 }}>
        <button 
          onClick={() => setCurrentView('admin')}
          style={{
            backgroundColor: '#FFD000',
            color: '#311E18',
            fontFamily: "'Luckiest Guy', cursive",
            padding: '12px 24px',
            border: 'none',
            borderRadius: '30px',
            cursor: 'pointer',
            boxShadow: '0 8px 25px rgba(61, 39, 29, 0.2)',
            fontSize: '1rem'
          }}
        >
          🚀 Open Admin Panel
        </button>
      </div>

      <Cart 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        totalItems={cartItemCount}
      />
    </div>
  );
}