import React, { useRef } from 'react';
import { X, Printer, CheckCircle, Clock, Coffee, ShieldCheck } from 'lucide-react';
import { getCafeSettings } from '../utils/cafeSettings';
import './OrderBillModal.css';

export default function OrderBillModal({ isOpen, onClose, order }) {
  const billPrintRef = useRef(null);
  const cafeSettings = getCafeSettings();

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = order.created_at
    ? new Date(order.created_at).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : new Date().toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });

  const orderNumber =
    order.order_number ||
    (order.id ? (String(order.id).startsWith('#') ? order.id : `#YRN-${order.id}`) : '#YRN-0000');

  const orderTypeLabel =
    order.order_type === 'dine-in'
      ? `Dine-In (Table ${order.table_no || 'N/A'})`
      : `Takeaway (Pickup: ${order.pickup_time || 'ASAP'})`;

  // Determine items list from order snapshot or joined order_items
  const items = Array.isArray(order.order_items) && order.order_items.length > 0
    ? order.order_items
    : Array.isArray(order.items)
    ? order.items
    : [];

  const subtotal = Number(order.total_amount || order.total || 0);
  const tax = 0; // Tax configuration hook
  const total = subtotal + tax;

  const isPaid = (order.payment_status || '').toLowerCase() === 'paid';
  const paymentModeLabel = (order.payment_mode || 'Cash').toUpperCase();

  return (
    <div className="order-bill-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="order-bill-container"
        onClick={(e) => e.stopPropagation()}
        ref={billPrintRef}
      >
        {/* Bill Actions (Hidden during print) */}
        <div className="bill-actions-header no-print">
          <div className="bill-actions-title">Customer Bill & Receipt</div>
          <div className="bill-actions-buttons">
            <button
              type="button"
              className="bill-btn bill-btn-print"
              onClick={handlePrint}
              title="Print or Save as PDF"
            >
              <Printer size={16} /> Print / Save PDF
            </button>
            <button
              type="button"
              className="bill-btn bill-btn-close"
              onClick={onClose}
              aria-label="Close bill"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper */}
        <div className="bill-receipt-paper">
          {/* Header Branding */}
          <div className="bill-receipt-header">
            <div className="bill-brand-badge">
              <Coffee size={24} className="bill-brand-icon" />
              <h2 className="bill-cafe-name">{cafeSettings.cafeName || 'YAARANA CAFE'}</h2>
            </div>
            <p className="bill-cafe-tagline">Good Food • Great Friends • Best Moments</p>
            <p className="bill-cafe-contact">
              {cafeSettings.address && <span>{cafeSettings.address}</span>}
              {cafeSettings.contactNumber && <span> • Tel: {cafeSettings.contactNumber}</span>}
            </p>
          </div>

          <div className="bill-divider-dash" />

          {/* Order Metadata */}
          <div className="bill-meta-grid">
            <div className="bill-meta-item">
              <span className="bill-meta-label">ORDER NO:</span>
              <strong className="bill-meta-value highlight-num">{orderNumber}</strong>
            </div>
            <div className="bill-meta-item text-right">
              <span className="bill-meta-label">DATE & TIME:</span>
              <span className="bill-meta-value">{formattedDate}</span>
            </div>
            <div className="bill-meta-item">
              <span className="bill-meta-label">ORDER TYPE:</span>
              <strong className="bill-meta-value">{orderTypeLabel}</strong>
            </div>
            <div className="bill-meta-item text-right">
              <span className="bill-meta-label">CUSTOMER:</span>
              <span className="bill-meta-value">
                {order.customer_name || 'Valued Guest'}
                {order.customer_phone ? ` (${order.customer_phone})` : ''}
              </span>
            </div>
          </div>

          <div className="bill-divider-dash" />

          {/* Items Table */}
          <table className="bill-items-table">
            <thead>
              <tr>
                <th className="th-item">ITEM DESCRIPTION</th>
                <th className="th-qty">QTY</th>
                <th className="th-price">PRICE</th>
                <th className="th-total">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-2">
                    {order.items_description || 'Order items summary'}
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => {
                  const name =
                    item.item_name ||
                    item.name ||
                    item.menu_items?.name ||
                    `Item ${idx + 1}`;
                  const qty = Number(item.quantity) || 1;
                  const unitPrice = Number(item.unit_price || item.price || 0);
                  const lineTotal = unitPrice * qty;

                  return (
                    <tr key={item.id || idx}>
                      <td className="td-item">
                        <span className="dish-name">{name}</span>
                      </td>
                      <td className="td-qty">{qty}</td>
                      <td className="td-price">₹{unitPrice.toFixed(2)}</td>
                      <td className="td-total">₹{lineTotal.toFixed(2)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          <div className="bill-divider-dash" />

          {/* Totals Breakdown */}
          <div className="bill-totals-section">
            <div className="bill-total-row">
              <span>Subtotal:</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            {tax > 0 && (
              <div className="bill-total-row">
                <span>Taxes:</span>
                <span>₹{tax.toFixed(2)}</span>
              </div>
            )}
            <div className="bill-total-row bill-grand-total">
              <span>FINAL PAYABLE:</span>
              <strong>₹{total.toFixed(2)}</strong>
            </div>
          </div>

          <div className="bill-divider-dash" />

          {/* Payment Status & Details */}
          <div className="bill-payment-box">
            <div className="payment-status-row">
              <span className="bill-meta-label">PAYMENT METHOD:</span>
              <strong className="bill-meta-value">{paymentModeLabel}</strong>
            </div>
            <div className="payment-status-row">
              <span className="bill-meta-label">PAYMENT STATUS:</span>
              <span
                className={`bill-payment-pill ${
                  isPaid ? 'pill-paid' : 'pill-pending'
                }`}
              >
                {isPaid ? (
                  <>
                    <CheckCircle size={14} /> PAID IN FULL
                  </>
                ) : (
                  <>
                    <Clock size={14} /> PENDING COLLECTION
                  </>
                )}
              </span>
            </div>
            {order.payment_reference && (
              <div className="payment-status-row">
                <span className="bill-meta-label">REF / UTR:</span>
                <span className="bill-meta-value font-mono">
                  {order.payment_reference}
                </span>
              </div>
            )}
            {order.paid_at && isPaid && (
              <div className="payment-status-row">
                <span className="bill-meta-label">PAID ON:</span>
                <span className="bill-meta-value">
                  {new Date(order.paid_at).toLocaleString('en-IN', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </span>
              </div>
            )}
          </div>

          {/* Footer Note */}
          <div className="bill-receipt-footer">
            <p className="bill-thankyou">Thank You for Dining with YAARANA!</p>
            <p className="bill-footnote">
              <ShieldCheck size={13} style={{ verticalAlign: '-2px' }} /> Computer-generated cafe order receipt.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
