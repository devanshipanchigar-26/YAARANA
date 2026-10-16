import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, User, Menu, X } from 'lucide-react';
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
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      </ul>

      {/* Action Buttons */}
      <div className="navbar-buttons">
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

        <button
          className="icon-button profile-icon-btn"
          type="button"
          aria-label="User profile"
          title={user ? 'My Profile' : 'Log In'}
          onClick={() => {
            setMobileMenuOpen(false);
            if (user) {
              navigate('/profile');
            } else {
              navigate('/login', { state: { returnUrl: '/profile' } });
            }
          }}
        >
          <User size={22} />
        </button>

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