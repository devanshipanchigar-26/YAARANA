import React, { useState } from 'react';
import Navbar from './Components/Navbar';
import HomePage from './Pages/HomePage';
import MenuPage from './Pages/MenuPage';
import BookTablePage from './Pages/BookTablePage';
import Cart from './Cart/Cart';
import AdminLayout from './admin/AdminLayout';
import LiveOrdersPage from './admin/LiveOrdersPage';
import OrderHistoryPage from './admin/OrderHistoryPage';
import MenuManagementPage from './admin/MenuManagementPage';
import CustomersPage from './admin/CustomersPage';
import SalesStatisticsPage from './admin/SalesStatisticsPage';
import ReviewsPage from './admin/ReviewsPage';
import './App.css';

export default function App() {
  // Toggle between 'website' and 'admin' views
  const [currentView, setCurrentView] = useState('website');
  const [activeAdminTab, setActiveAdminTab] = useState('menu-management');

  // Which customer page is showing: 'home' | 'menu' | 'book-table'
  const [customerPage, setCustomerPage] = useState('home');

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState([]);

  // Cart count is calculated from the items, so it can never get out of sync
  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Add an item, or increase its quantity if it's already in the cart
  const addToCart = (item) => {
    setCartItems((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
          emoji: item.emoji || '🍽️',
        },
      ];
    });
  };

  // Switch customer page and start at the top of the new page
  const navigateTo = (page) => {
    setCustomerPage(page);
    window.scrollTo(0, 0);
  };

  // If view mode is admin, render the admin dashboard layout
  if (currentView === 'admin') {
    return (
      <div className="app-root">
        <AdminLayout activeTab={activeAdminTab} setActiveTab={setActiveAdminTab}>
          {activeAdminTab === 'live-orders' && <LiveOrdersPage />}
          {activeAdminTab === 'order-history' && <OrderHistoryPage />}
          {activeAdminTab === 'menu-management' && <MenuManagementPage />}
          {activeAdminTab === 'customers' && <CustomersPage />}
          {activeAdminTab === 'reviews' && <ReviewsPage />}
          {(activeAdminTab === 'sales-statistics' || activeAdminTab === 'sales' || activeAdminTab === 'sales-stats') && <SalesStatisticsPage />}

          {activeAdminTab !== 'live-orders' &&
          activeAdminTab !== 'order-history' &&
          activeAdminTab !== 'menu-management' &&
          activeAdminTab !== 'customers' &&
          activeAdminTab !== 'sales-statistics' &&
          activeAdminTab !== 'sales' &&
          activeAdminTab !== 'sales-stats' &&
          activeAdminTab !== 'reviews' && (
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
        onNavigate={navigateTo}
        currentPage={customerPage}
      />

      {customerPage === 'home' && <HomePage onNavigate={navigateTo} />}
      {customerPage === 'menu' && <MenuPage addToCart={addToCart} />}
      {customerPage === 'book-table' && <BookTablePage />}

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