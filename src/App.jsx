import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
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
import Login from './Pages/Login';
import Signup from './Pages/Signup';
import ForgotPassword from './Pages/ForgotPassword';
import ResetPassword from './Pages/ResetPassword';
import { AuthProvider } from './context/AuthContext';
import './App.css';

const CART_KEY = 'yaarana_cart';

// Read the saved cart from the browser (empty if nothing saved)
const loadCart = () => {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();

  // Toggle between 'website' and 'admin' views
  const [currentView, setCurrentView] = useState('website');
  const [activeAdminTab, setActiveAdminTab] = useState('menu-management');

  // Which customer page is showing: 'home' | 'menu' | 'book-table'
  const [customerPage, setCustomerPage] = useState('home');

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartInitialStep, setCartInitialStep] = useState('cart');
  const [cartItems, setCartItems] = useState(loadCart);

  // Table number from the QR code link, e.g. yoursite.com/?table=5
  const [qrTable] = useState(
    () => new URLSearchParams(window.location.search).get('table') || ''
  );

  // Resume checkout if user was redirected back from successful login
  useEffect(() => {
    if (location.state?.resumeCheckout) {
      setIsCartOpen(true);
      setCartInitialStep('checkout');
      // Clear navigation state so it doesn't re-trigger unexpectedly
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  // Keep the cart saved, so a refresh doesn't empty it
  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cartItems));
    } catch {
      /* storage unavailable - cart just won't persist */
    }
  }, [cartItems]);

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
          emoji: item.emoji || '',
        },
      ];
    });
  };

  const increaseQuantity = (id) =>
    setCartItems((prev) =>
      prev.map((c) => (c.id === id ? { ...c, quantity: c.quantity + 1 } : c))
    );

  const decreaseQuantity = (id) =>
    setCartItems((prev) =>
      prev
        .map((c) => (c.id === id ? { ...c, quantity: c.quantity - 1 } : c))
        .filter((c) => c.quantity > 0)
    );

  const removeItem = (id) =>
    setCartItems((prev) => prev.filter((c) => c.id !== id));

  const clearCart = () => setCartItems([]);

  // Switch customer page and start at the top of the new page
  const navigateTo = (page) => {
    if (page === 'login') {
      navigate('/login');
      return;
    }
    if (page === 'signup') {
      navigate('/signup');
      return;
    }
    if (page === 'forgot-password') {
      navigate('/forgot-password');
      return;
    }
    if (location.pathname !== '/') {
      navigate('/');
    }
    setCustomerPage(page);
    window.scrollTo(0, 0);
  };

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="*"
        element={
          currentView === 'admin' ? (
            <div className="app-root">
              <AdminLayout
                activeTab={activeAdminTab}
                setActiveTab={setActiveAdminTab}
                onBackToWebsite={() => setCurrentView('website')}
              >
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
          ) : (
            <div className="app">
              <Navbar
                onCartClick={() => {
                  setCartInitialStep('cart');
                  setIsCartOpen(true);
                }}
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
                onClose={() => {
                  setIsCartOpen(false);
                  setCartInitialStep('cart');
                }}
                items={cartItems}
                increaseQuantity={increaseQuantity}
                decreaseQuantity={decreaseQuantity}
                removeItem={removeItem}
                clearCart={clearCart}
                defaultTable={qrTable}
                initialStep={cartInitialStep}
                onRequireLogin={() => {
                  setIsCartOpen(false);
                  navigate('/login', { state: { returnToCheckout: true } });
                }}
                onExplore={() => {
                  setIsCartOpen(false);
                  navigateTo('menu');
                }}
              />
            </div>
          )
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}