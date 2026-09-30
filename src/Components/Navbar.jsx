import React from 'react';
import { Heart, ShoppingCart } from 'lucide-react';
import './Navbar.css';

export default function Navbar({
  cartItemCount = 0,
  onCartClick,
  onNavigate = () => {},
  currentPage = 'home',
}) {
  // Go to a page (home / menu / book-table)
  const goToPage = (e, page) => {
    e.preventDefault();
    onNavigate(page);
  };

  // Scroll to a section of the home page (contact, story...)
  // If we're on another page, go home first, then scroll once it has rendered
  const goToSection = (e, sectionId) => {
    e.preventDefault();

    const scrollToSection = () => {
      const section = document.getElementById(sectionId);
      if (section) section.scrollIntoView({ behavior: 'smooth' });
    };

    if (currentPage !== 'home') {
      onNavigate('home');
      setTimeout(scrollToSection, 50);
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
        Y<span className="dot dot-pink">•</span>
        A<span className="dot dot-cyan">•</span>
        A<span className="dot dot-yellow">•</span>
        R<span className="dot dot-pink">•</span>
        A<span className="dot dot-yellow">•</span>
        N<span className="dot dot-cyan">•</span>
        A
      </div>

      {/* Navigation */}
      <ul className="navbar-links">
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

      {/* Icons */}
      <div className="navbar-buttons">
        <button className="icon-button" type="button" aria-label="Wishlist">
          <Heart size={22} />
        </button>
        <button
          className="icon-button cart-icon-btn"
          type="button"
          aria-label="Shopping cart"
          onClick={onCartClick}
        >
          <ShoppingCart size={22} />
          {cartItemCount > 0 && <span className="cart-badge">{cartItemCount}</span>}
        </button>
      </div>
    </nav>
  );
}