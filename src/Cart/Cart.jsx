import React from "react";
import "./Cart.css";

export default function Cart({
  isOpen,
  onClose,
  items = [],
  increaseQuantity,
  decreaseQuantity,
  removeItem,
  totalItems = 0,
}) {
  const subtotal = items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const deliveryFee = items.length > 0 ? 40 : 0;
  const total = subtotal + deliveryFee;

  return (
    <>
      {/* Dark background overlay */}
      <div
        className={`cart-overlay ${isOpen ? "show-overlay" : ""}`}
        onClick={onClose}
      ></div>

      {/* CART SIDEBAR */}
      <aside className={`cart-sidebar ${isOpen ? "cart-open" : ""}`}>
        {/* HEADER */}
        <div className="cart-header">
          <div>
            <span className="cart-mini-title">YAARANA</span>
            <h2>
              Your Cart
              {/* Only shows count badge if cart has items */}
              {totalItems > 0 && <span className="cart-count">{totalItems}</span>}
            </h2>
          </div>

          <button
            className="cart-close"
            onClick={onClose}
            aria-label="Close cart"
          >
            ×
          </button>
        </div>

        {/* PROMO BOX */}
        {items.length > 0 && (
          <div className="cart-promo">
            <div className="promo-icon">✨</div>

            <div className="promo-text">
              <strong>Almost there!</strong>
              <p>Add ₹272 more to get FREE DELIVERY</p>

              <div className="promo-progress">
                <div className="promo-progress-fill"></div>
              </div>
            </div>

            <span className="promo-price">₹500</span>
          </div>
        )}

        {/* ITEMS LIST / EMPTY STATE AREA */}
        <div className="cart-items">
          {items.length === 0 ? (
            <div className="empty-cart">
              <div className="empty-cart-icon">🛒</div>
              <h3>Your cart is empty</h3>
              <p>Looks like your Yaar needs a little more food!</p>
              {/* Styled with signature yellow matching ORDER NOW */}
              <button onClick={onClose}>Explore Menu</button>
            </div>
          ) : (
            items.map((item) => (
              <div className="cart-item" key={item.id}>
                <div className="item-image">{item.emoji || "🍔"}</div>

                <div className="item-details">
                  <h3>{item.name}</h3>
                  <p className="item-price">₹{item.price}</p>
                </div>

                <div className="item-actions">
                  <div className="quantity-control">
                    <button onClick={() => decreaseQuantity(item.id)}>
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button onClick={() => increaseQuantity(item.id)}>
                      +
                    </button>
                  </div>

                  <button
                    className="remove-btn"
                    onClick={() => removeItem(item.id)}
                    title="Remove item"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* CART BOTTOM / CHECKOUT */}
        {items.length > 0 && (
          <div className="cart-bottom">
            <div className="bill-row">
              <span>Subtotal</span>
              <strong>₹{subtotal}</strong>
            </div>

            <div className="bill-row">
              <span>Delivery Fee</span>
              <strong>₹{deliveryFee}</strong>
            </div>

            <div className="bill-divider"></div>

            <div className="bill-row total-row">
              <span>Total</span>
              <strong>₹{total}</strong>
            </div>

            <button className="checkout-button">
              Proceed to Checkout
              <span>→</span>
            </button>

            <p className="secure-text">🔒 Secure checkout</p>
          </div>
        )}
      </aside>
    </>
  );
}