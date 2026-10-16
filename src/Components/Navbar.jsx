import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Heart, ShoppingCart, User, LogOut, Menu, X, Clock, Package } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar({
  cartItemCount = 0,
  onCartClick,
  onNavigate = () => {},
  currentPage = 'home',
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [lastOrderId, setLastOrderId] = useState(() => localStorage.getItem('yaarana_last_order_id'));
  const profileMenuRef = useRef(null);

  const isOrdersActive = location.pathname.startsWith('/my-orders') || location.pathname.startsWith('/track-order');

  useEffect(() => {
    // Keep lastOrderId synced with storage
    const syncOrderId = () => {
      setLastOrderId(localStorage.getItem('yaarana_last_order_id'));
    };
    window.addEventListener('storage', syncOrderId);
    return () => window.removeEventListener('storage', syncOrderId);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile drawer on escape key or resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 820) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Go to a page (home / menu / book-table)
  const goToPage = (e, page) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    onNavigate(page);
  };

  // Scroll to a section of the home page (contact, story...)
  const goToSection = (e, sectionId) => {
    e.preventDefault();
    setMobileMenuOpen(false);

    const scrollToSection = () => {
      const section = document.getElementById(sectionId);
      if (section) section.scrollIntoView({ behavior: 'smooth' });
    };

    if (currentPage !== 'home') {
      onNavigate('home');
      setTimeout(scrollToSection, 80);
    } else {
      scrollToSection();
    }
  };

  return (
    <nav className="navbar">
      {/* Logo */}
      <div
        className="navbar-logo"
        onClick={(e) => goToPage(e, 'home')}
        style={{ cursor: 'pointer' }}
      >
        <span>Y</span>
        <span className="dot dot-pink" />
        <span>A</span>
        <span className="dot dot-cyan" />
        <span>A</span>
        <span className="dot dot-yellow" />
        <span>R</span>
        <span className="dot dot-pink" />
        <span>A</span>
        <span className="dot dot-yellow" />
        <span>N</span>
        <span className="dot dot-cyan" />
        <span>A</span>
      </div>

      {/* Navigation Links */}
      <ul className={`navbar-links ${mobileMenuOpen ? 'open' : ''}`}>
        <li>
          <a href="#home" className="nav-link" onClick={(e) => goToPage(e, 'home')}>
            Home
          </a>
        </li>
        <li>
          <a href="#contact" className="nav-link" onClick={(e) => goToSection(e, 'contact')}>
            Contact Us
          </a>
        </li>
        <li>
          <a href="#story" className="nav-link" onClick={(e) => goToSection(e, 'story')}>
            About Us
          </a>
        </li>
        <li>
          <a href="#menu" className="nav-link" onClick={(e) => goToPage(e, 'menu')}>
            Menu
          </a>
        </li>
        <li>
          <a href="#book-table" className="nav-link" onClick={(e) => goToPage(e, 'book-table')}>
            Book a Table
          </a>
        </li>
        {(user || lastOrderId) && (
          <li>
            <a
              href="/my-orders"
              className={`nav-link ${isOrdersActive ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                setMobileMenuOpen(false);
                navigate(lastOrderId ? `/my-orders/${lastOrderId}` : '/my-orders');
              }}
            >
              My Orders
            </a>
          </li>
        )}
      </ul>

      {/* Action Buttons */}
      <div className="navbar-buttons">
        <button className="icon-button" type="button" aria-label="Wishlist">
          <Heart size={22} />
        </button>
        <button
          className="icon-button cart-icon-btn"
          type="button"
          aria-label="Shopping cart"
          onClick={() => {
            setMobileMenuOpen(false);
            onCartClick();
          }}
        >
          <ShoppingCart size={22} />
          {cartItemCount > 0 && <span className="cart-badge">{cartItemCount}</span>}
        </button>

        {user ? (
          <div className="profile-menu-wrapper" ref={profileMenuRef}>
            <button
              className="icon-button profile-icon-btn"
              type="button"
              aria-label="User profile"
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            >
              <User size={22} />
            </button>
            {profileMenuOpen && (
              <div className="profile-dropdown">
                <div className="profile-info">
                  <p className="profile-name">{profile?.name || user.email?.split('@')[0] || 'Member'}</p>
                  <p className="profile-email">{user.email}</p>
                </div>
                {profile?.role === 'admin' && (
                  <>
                    <button
                      type="button"
                      className="profile-logout-btn"
                      style={{ color: '#0086FF' }}
                      onClick={() => {
                        setProfileMenuOpen(false);
                        onNavigate('admin');
                      }}
                    >
                      🚀 Admin Panel
                    </button>
                    <div className="profile-divider" />
                  </>
                )}
                <button
                  type="button"
                  className="profile-logout-btn"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    navigate(lastOrderId ? `/my-orders/${lastOrderId}` : '/my-orders');
                  }}
                >
                  <Package size={16} /> My Orders
                </button>
                <button
                  type="button"
                  className="profile-logout-btn"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    signOut();
                  }}
                >
                  <LogOut size={16} /> Log Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            className="nav-login-btn"
            onClick={() => {
              setMobileMenuOpen(false);
              onNavigate('login');
            }}
          >
            LOGIN
          </button>
        )}

        {/* Mobile Hamburger Toggle Button */}
        <button
          className="icon-button hamburger-button"
          type="button"
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
    </nav>
  );
}