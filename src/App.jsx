import React, { useState } from 'react';
import Navbar from './Components/Navbar';
import HomePage from './Pages/HomePage';
import Cart from './Cart/Cart';
import './App.css';

export default function App() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Sample cart items state
  const [cartItems, setCartItems] = useState([
    { id: 1, name: 'Hazelnut Cold Coffee', price: 199, quantity: 1, emoji: '☕' },
    { id: 2, name: 'Loaded Cheese Fries', price: 229, quantity: 1, emoji: '🍟' }
  ]);

  const handleIncreaseQuantity = (id) => {
    setCartItems(cartItems.map(item => 
      item.id === id ? { ...item, quantity: item.quantity + 1 } : item
    ));
  };

  const handleDecreaseQuantity = (id) => {
    setCartItems(cartItems.map(item => 
      item.id === id && item.quantity > 1 ? { ...item, quantity: item.quantity - 1 } : item
    ));
  };

  const handleRemoveItem = (id) => {
    setCartItems(cartItems.filter(item => item.id !== id));
  };

  const totalItemsCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="app">
      <Navbar 
        onCartClick={() => setIsCartOpen(true)} 
        cartItemCount={totalItemsCount} 
      />
      
      <HomePage />

      {/* Cart Drawer Component */}
      <Cart 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        totalItems={totalItemsCount}
        increaseQuantity={handleIncreaseQuantity}
        decreaseQuantity={handleDecreaseQuantity}
        removeItem={handleRemoveItem}
      />
    </div>
  );
}