import React from 'react';
import { Heart, ShoppingCart } from 'lucide-react';
import Cart from '../Cart/Cart'; // Correct relative path to the Cart folder
import './Navbar.css';

export default function Navbar({ cartItemCount = 0, onCartClick }) {
  return (
    <nav className="navbar">
      {/* Logo */}
      <div className="navbar-logo">
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
        <li><a href="#home" className="nav-link">Home</a></li>
        <li><a href="#contact" className="nav-link">Contact Us</a></li>
        <li><a href="#story" className="nav-link">About Us</a></li>
        <li><a href="#specials" className="nav-link">Menu</a></li>
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