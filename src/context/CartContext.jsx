import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

// Storage keys for isolated carts per user
export const getCartKey = (userId) => (userId ? `yaarana_cart_user_${userId}` : 'yaarana_cart_guest');

// Read the saved cart for a specific user from browser storage
export const loadCartForUser = (userId) => {
  try {
    const raw = localStorage.getItem(getCartKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// Safely merge guest items into a user cart without duplicates
export const mergeCarts = (userCart, guestCart) => {
  if (!Array.isArray(guestCart) || guestCart.length === 0) return Array.isArray(userCart) ? userCart : [];
  if (!Array.isArray(userCart) || userCart.length === 0) return [...guestCart];

  const merged = [...userCart];
  guestCart.forEach((guestItem) => {
    const existingIndex = merged.findIndex((item) => String(item.id) === String(guestItem.id));
    if (existingIndex > -1) {
      // Duplicate-safe: combine quantities cleanly
      merged[existingIndex] = {
        ...merged[existingIndex],
        quantity: (merged[existingIndex].quantity || 1) + (guestItem.quantity || 1),
      };
    } else {
      merged.push({ ...guestItem });
    }
  });
  return merged;
};

export function CartProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const currentUserId = user?.id || null;

  // Track the previous user ID to detect authentication transitions
  const prevUserIdRef = useRef(currentUserId);
  const isHydratedRef = useRef(false);

  // Initialize cart state synchronously from active storage on initial mount
  const [cartItems, setCartItems] = useState(() => {
    const initialUserCart = loadCartForUser(currentUserId);
    // If mounting with an authenticated user, also absorb any leftover guest cart
    if (currentUserId) {
      const guestCart = loadCartForUser(null);
      if (guestCart.length > 0) {
        const merged = mergeCarts(initialUserCart, guestCart);
        try {
          localStorage.setItem(getCartKey(currentUserId), JSON.stringify(merged));
          localStorage.removeItem(getCartKey(null));
        } catch {}
        return merged;
      }
    }
    return initialUserCart;
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartInitialStep, setCartInitialStep] = useState('cart');

  // Mark hydration complete once initial mount finishes
  useEffect(() => {
    isHydratedRef.current = true;
  }, []);

  // Synchronize and isolate cart when authentication identity changes
  useEffect(() => {
    const prevUserId = prevUserIdRef.current;

    // Skip if user hasn't changed
    if (prevUserId === currentUserId) return;

    if (!prevUserId && currentUserId) {
      // Transition: GUEST -> AUTHENTICATED USER (e.g. user just logged in)
      const guestCart = loadCartForUser(null);
      const activeGuestItems = cartItems.length > 0 ? cartItems : guestCart;
      const userSavedCart = loadCartForUser(currentUserId);
      const finalCart = mergeCarts(userSavedCart, activeGuestItems);

      try {
        localStorage.setItem(getCartKey(currentUserId), JSON.stringify(finalCart));
        localStorage.removeItem(getCartKey(null));
      } catch {}

      setCartItems(finalCart);
    } else if (prevUserId && !currentUserId) {
      // Transition: AUTHENTICATED USER -> LOGOUT (GUEST)
      // Save logging-out user's cart safely
      try {
        localStorage.setItem(getCartKey(prevUserId), JSON.stringify(cartItems));
        localStorage.removeItem(getCartKey(null));
      } catch {}

      // Reset active cart to empty so no user items leak to guest session
      setCartItems([]);
    } else if (prevUserId && currentUserId && prevUserId !== currentUserId) {
      // Transition: USER A -> USER B
      try {
        localStorage.setItem(getCartKey(prevUserId), JSON.stringify(cartItems));
      } catch {}

      const userBCart = loadCartForUser(currentUserId);
      setCartItems(userBCart);
    }

    prevUserIdRef.current = currentUserId;
  }, [currentUserId]);

  // Persist cart changes to local storage under the active user's key
  useEffect(() => {
    // Only write after initial hydration to prevent overwriting with stale initial state
    if (!isHydratedRef.current) return;
    try {
      localStorage.setItem(getCartKey(currentUserId), JSON.stringify(cartItems));
    } catch {
      /* storage unavailable */
    }
  }, [cartItems, currentUserId]);

  const addToCart = useCallback((item) => {
    setCartItems((prev) => {
      const existing = prev.find((c) => String(c.id) === String(item.id));
      if (existing) {
        return prev.map((c) =>
          String(c.id) === String(item.id) ? { ...c, quantity: (c.quantity || 1) + 1 } : c
        );
      }
      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          price: Number(item.price) || 0,
          quantity: 1,
          emoji: item.emoji || '',
        },
      ];
    });
  }, []);

  const increaseQuantity = useCallback((id) => {
    setCartItems((prev) =>
      prev.map((c) => (String(c.id) === String(id) ? { ...c, quantity: (c.quantity || 1) + 1 } : c))
    );
  }, []);

  const decreaseQuantity = useCallback((id) => {
    setCartItems((prev) =>
      prev
        .map((c) => (String(c.id) === String(id) ? { ...c, quantity: (c.quantity || 1) - 1 } : c))
        .filter((c) => (c.quantity || 0) > 0)
    );
  }, []);

  const removeItem = useCallback((id) => {
    setCartItems((prev) => prev.filter((c) => String(c.id) !== String(id)));
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
    try {
      localStorage.removeItem(getCartKey(currentUserId));
    } catch {}
  }, [currentUserId]);

  const cartItemCount = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);

  const openCart = useCallback((step = 'cart') => {
    setCartInitialStep(step);
    setIsCartOpen(true);
  }, []);

  const closeCart = useCallback(() => {
    setIsCartOpen(false);
    setCartInitialStep('cart');
  }, []);

  const value = {
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
    setIsCartOpen,
    setCartInitialStep,
    currentUserId,
    authLoading,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
