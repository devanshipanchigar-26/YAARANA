import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import Navbar from './Components/Navbar';
import HomePage from './Pages/HomePage';
import MenuPage from './Pages/MenuPage';
import BookTablePage from './Pages/BookTablePage';
import Cart from './Cart/Cart';
import AdminLayout from './admin/AdminLayout';
import LiveOrdersPage from './admin/LiveOrdersPage';
import OrderHistoryPage from './admin/OrderHistoryPage';
import TableBookingsPage from './admin/TableBookingsPage';
import TablesQRManagementPage from './admin/TablesQRManagementPage';
import MenuManagementPage from './admin/MenuManagementPage';
import SpecialsManagementPage from './admin/SpecialsManagementPage';
import CustomersPage from './admin/CustomersPage';
import SalesStatisticsPage from './admin/SalesStatisticsPage';
import ReviewsPage from './admin/ReviewsPage';
import MessagesPage from './admin/MessagesPage';
import SettingsPage from './admin/SettingsPage';
import Login from './Pages/Login';
import Signup from './Pages/Signup';
import ForgotPassword from './Pages/ForgotPassword';
import ResetPassword from './Pages/ResetPassword';
import TrackOrderPage from './Pages/TrackOrderPage';
import MyOrdersPage from './Pages/MyOrdersPage';
import MyBookingsPage from './Pages/MyBookingsPage';
import ProfilePage from './Pages/ProfilePage';
import About from './Pages/About';
import Contact from './Pages/Contact';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { TableProvider, useTable } from './context/TableContext';
import './App.css';

// Guard component to protect admin routes from unauthenticated users and customers
function ProtectedAdminRoute({ children }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FAF6F0',
          fontFamily: "'Luckiest Guy', cursive",
          color: '#311E18',
          fontSize: '1.25rem',
          letterSpacing: '0.5px'
        }}
      >
        Loading YAARANA Admin...
      </div>
    );
  }

  const isAdmin = profile?.role === 'admin' || user?.user_metadata?.role === 'admin';

  if (!user) {
    return <Navigate to="/login" state={{ returnUrl: location.pathname, adminMode: true }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || user?.user_metadata?.role === 'admin';

  // Cart operations from isolated CartContext
  const {
    cartItems,
    cartItemCount,
    isCartOpen,
    cartInitialStep,
    addToCart,
    increaseQuantity,
    decreaseQuantity,
    removeItem,
    clearCart,
    openCart,
    closeCart,
  } = useCart();

  // Active admin tab defaults to 'live-orders' and preserves on refresh
  const [activeAdminTab, setActiveAdminTab] = useState(() => {
    return sessionStorage.getItem('activeAdminTab') || 'live-orders';
  });

  const handleAdminTabChange = (tab) => {
    setActiveAdminTab(tab);
    sessionStorage.setItem('activeAdminTab', tab);
  };

  // Active table identity from TableContext
  const { activeTable, tableNo: qrTable, tableError, clearTable } = useTable();

  // Which customer page is showing: 'home' | 'menu' | 'book-table' | 'about' | 'contact'
  const [customerPage, setCustomerPage] = useState(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path === '/about') return 'about';
      if (path === '/contact') return 'contact';
      if (path === '/menu') return 'menu';
      if (path === '/book-table') return 'book-table';
      // If table query parameter detected in URL, open Menu directly
      if (new URLSearchParams(window.location.search).get('table')) return 'menu';
    }
    return 'home';
  });

  // Sync customerPage when browser navigation (back/forward) occurs
  useEffect(() => {
    if (location.pathname === '/about') {
      setCustomerPage('about');
    } else if (location.pathname === '/contact') {
      setCustomerPage('contact');
    } else if (location.pathname === '/menu') {
      setCustomerPage('menu');
    } else if (location.pathname === '/book-table') {
      setCustomerPage('book-table');
    } else if (location.pathname === '/') {
      setCustomerPage('home');
    }
  }, [location.pathname]);

  // Resume checkout or book table if user was redirected back from successful login
  useEffect(() => {
    if (location.state?.resumeCheckout) {
      openCart('checkout');
      // Clear navigation state so it doesn't re-trigger unexpectedly
      navigate(location.pathname, { replace: true, state: {} });
    } else if (location.state?.openBookTable) {
      setCustomerPage('book-table');
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname, openCart]);

  // Handle direct openAdmin navigation flag from legacy links
  useEffect(() => {
    if (location.state?.openAdmin) {
      navigate('/admin', { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  // Switch customer page and start at the top of the new page
  const navigateTo = (page) => {
    if (page === 'admin') {
      navigate('/admin');
      window.scrollTo(0, 0);
      return;
    }
    if (page === 'login') {
      navigate('/login');
      return;
    }
    if (page === 'my-orders') {
      navigate('/my-orders');
      return;
    }
    if (page === 'my-bookings') {
      navigate('/my-bookings');
      return;
    }
    if (page === 'profile') {
      navigate('/profile');
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
    if (page === 'about') {
      navigate('/about');
      setCustomerPage('about');
      window.scrollTo(0, 0);
      return;
    }
    if (page === 'contact') {
      navigate('/contact');
      setCustomerPage('contact');
      window.scrollTo(0, 0);
      return;
    }
    if (page === 'menu') {
      navigate('/menu');
      setCustomerPage('menu');
      window.scrollTo(0, 0);
      return;
    }
    if (page === 'book-table') {
      navigate('/book-table');
      setCustomerPage('book-table');
      window.scrollTo(0, 0);
      return;
    }
    if (page === 'home') {
      navigate('/');
      setCustomerPage('home');
      window.scrollTo(0, 0);
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
        path="/my-orders"
        element={
          <MyOrdersPage
            onNavigateToMenu={() => navigateTo('menu')}
            onBackHome={() => navigateTo('home')}
          />
        }
      />
      <Route
        path="/my-orders/:orderId"
        element={
          <MyOrdersPage
            onNavigateToMenu={() => navigateTo('menu')}
            onBackHome={() => navigateTo('home')}
          />
        }
      />
      <Route
        path="/track-order/:orderId"
        element={
          <MyOrdersPage
            onNavigateToMenu={() => navigateTo('menu')}
            onBackHome={() => navigateTo('home')}
          />
        }
      />
      <Route
        path="/my-bookings"
        element={
          <MyBookingsPage
            onNavigateToMenu={() => navigateTo('menu')}
            onNavigateToBookTable={() => navigateTo('book-table')}
            onBackHome={() => navigateTo('home')}
          />
        }
      />
      <Route
        path="/profile"
        element={
          <ProfilePage
            onBackHome={() => navigateTo('home')}
            onNavigateToOrders={() => navigateTo('my-orders')}
            onNavigateToBookings={() => navigateTo('my-bookings')}
          />
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedAdminRoute>
            <div className="app-root">
              <AdminLayout
                activeTab={activeAdminTab}
                setActiveTab={handleAdminTabChange}
                onBackToWebsite={() => {
                  setCustomerPage('home');
                  navigate('/');
                }}
              >
                {activeAdminTab === 'live-orders' && <LiveOrdersPage />}
                {activeAdminTab === 'order-history' && <OrderHistoryPage />}
                {activeAdminTab === 'table-bookings' && <TableBookingsPage />}
                {activeAdminTab === 'tables-qr' && <TablesQRManagementPage />}
                {activeAdminTab === 'menu-management' && <MenuManagementPage />}
                {activeAdminTab === 'specials' && <SpecialsManagementPage />}
                {activeAdminTab === 'customers' && <CustomersPage initialSubTab="directory" />}
                {activeAdminTab === 'messages' && <CustomersPage initialSubTab="messages" />}
                {activeAdminTab === 'reviews' && <ReviewsPage />}
                {(activeAdminTab === 'sales-statistics' || activeAdminTab === 'sales' || activeAdminTab === 'sales-stats') && <SalesStatisticsPage />}
                {activeAdminTab === 'settings' && <SettingsPage />}

                {activeAdminTab !== 'live-orders' &&
                  activeAdminTab !== 'order-history' &&
                  activeAdminTab !== 'table-bookings' &&
                  activeAdminTab !== 'tables-qr' &&
                  activeAdminTab !== 'menu-management' &&
                  activeAdminTab !== 'specials' &&
                  activeAdminTab !== 'customers' &&
                  activeAdminTab !== 'messages' &&
                  activeAdminTab !== 'sales-statistics' &&
                  activeAdminTab !== 'sales' &&
                  activeAdminTab !== 'sales-stats' &&
                  activeAdminTab !== 'reviews' &&
                  activeAdminTab !== 'settings' && (
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
                    onClick={() => {
                      setCustomerPage('home');
                      navigate('/');
                    }}
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
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="*"
        element={
          <div className="app">
            <Navbar
              onCartClick={() => openCart('cart')}
              cartItemCount={cartItemCount}
              onNavigate={navigateTo}
              currentPage={customerPage}
            />

            {/* Sticky QR Dine-In Pill Banner */}
            {activeTable && (
              <div 
                style={{
                  position: 'sticky',
                  top: '80px',
                  zIndex: 990,
                  background: '#311E18',
                  color: '#FFD000',
                  padding: '8px 20px',
                  margin: '0 auto',
                  maxWidth: '420px',
                  borderRadius: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 6px 20px rgba(49, 30, 24, 0.3)',
                  fontFamily: "'Luckiest Guy', cursive",
                  fontSize: '0.9rem',
                  letterSpacing: '0.5px'
                }}
              >
                <span>🍽️ Dining at Table {activeTable.table_no} ({activeTable.seats} Seats)</span>
                <button
                  onClick={clearTable}
                  style={{
                    background: 'rgba(255, 208, 0, 0.2)',
                    color: '#FFD000',
                    border: '1px solid #FFD000',
                    borderRadius: '12px',
                    padding: '2px 8px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontFamily: 'inherit'
                  }}
                  title="Leave table / Switch to takeaway"
                >
                  Change
                </button>
              </div>
            )}

            {tableError && (
              <div 
                style={{
                  position: 'sticky',
                  top: '80px',
                  zIndex: 990,
                  background: '#FEF2F2',
                  color: '#991B1B',
                  padding: '10px 20px',
                  margin: '0 auto',
                  maxWidth: '480px',
                  borderRadius: '16px',
                  border: '1px solid #FECACA',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.85rem',
                  fontWeight: 700
                }}
              >
                <span>⚠️ {tableError}</span>
              </div>
            )}

            {customerPage === 'home' && <HomePage onNavigate={navigateTo} />}
            {customerPage === 'menu' && <MenuPage addToCart={addToCart} />}
            {customerPage === 'book-table' && <BookTablePage />}
            {customerPage === 'about' && <About onNavigate={navigateTo} />}
            {customerPage === 'contact' && <Contact />}

            <Cart
              isOpen={isCartOpen}
              onClose={closeCart}
              items={cartItems}
              increaseQuantity={increaseQuantity}
              decreaseQuantity={decreaseQuantity}
              removeItem={removeItem}
              clearCart={clearCart}
              defaultTable={qrTable}
              initialStep={cartInitialStep}
              onRequireLogin={() => {
                closeCart();
                navigate('/login', { state: { returnToCheckout: true } });
              }}
              onExplore={() => {
                closeCart();
                navigateTo('menu');
              }}
              onTrackOrder={(orderId, orderObj) => {
                closeCart();
                navigate(`/my-orders/${orderId}`, { state: { initialOrder: orderObj } });
              }}
            />
          </div>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <TableProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </TableProvider>
    </AuthProvider>
  );
}