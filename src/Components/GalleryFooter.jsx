import React from 'react';
import { useCafeSettings } from '../utils/cafeSettings';
import './GalleryFooter.css';

function formatTime12(timeStr) {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  const m = mStr || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

const galleryImagesRow1 = [
  { id: 1, title: "Cozy Corner", url: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&q=80" },
  { id: 2, title: "Artisan Coffee", url: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80" },
  { id: 3, title: "Crispy Treats", url: "https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=600&q=80" }
];

const galleryImagesRow2 = [
  { id: 4, title: "Sweet Waffles", url: "https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=600&q=80" },
  { id: 5, title: "Friends Hangout", url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80" },
  { id: 6, title: "Chilled Shakes", url: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80" }
];

export default function GalleryFooter() {
  const [cafeSettings] = useCafeSettings();
  const infiniteRow1 = [...galleryImagesRow1, ...galleryImagesRow1, ...galleryImagesRow1];
  const infiniteRow2 = [...galleryImagesRow2, ...galleryImagesRow2, ...galleryImagesRow2];

  const openFormatted = formatTime12(cafeSettings?.openingTime || '10:00');
  const closeFormatted = formatTime12(cafeSettings?.closingTime || '23:00');
  const closingDays = cafeSettings?.weeklyClosingDays || [];

  return (
    <footer className="scroll-section gallery-footer-section" id="contact">
      <div className="gallery-container">
        
        <div className="gallery-header">
          <h2 className="gallery-title">GALLERY</h2>
        </div>

        {/* Dual Track Marquee Carousels */}
        <div className="gallery-carousels-wrapper">
          
          {/* Row 1: Moves Left */}
          <div className="gallery-carousel-viewport">
            <div className="gallery-scroll-track track-left">
              {infiniteRow1.map((item, index) => (
                <div className="gallery-frame" key={`r1-${item.id}-${index}`}>
                  <img src={item.url} alt={item.title} className="gallery-img" />
                </div>
              ))}
            </div>
          </div>

          {/* Row 2: Moves Right */}
          <div className="gallery-carousel-viewport">
            <div className="gallery-scroll-track track-right">
              {infiniteRow2.map((item, index) => (
                <div className="gallery-frame" key={`r2-${item.id}-${index}`}>
                  <img src={item.url} alt={item.title} className="gallery-img" />
                </div>
              ))}
            </div>
          </div>

        </div>

        <div className="footer-info-grid">
          
          <div className="footer-col">
            <h3 className="footer-heading">ADDRESS</h3>
            <p className="footer-text">
              <span className="location-icon">📍</span> {cafeSettings?.address || '123 Yaarana Street, Foodie Hub, City'}
            </p>
            {cafeSettings?.contactNumber && (
              <p className="footer-text" style={{ marginTop: '6px' }}>
                <span className="location-icon">📞</span> {cafeSettings.contactNumber}
              </p>
            )}
            <div className="social-icons">
              <span className="icon">📷</span>
              <span className="icon">💬</span>
              <span className="icon">✉️</span>
              <span className="icon">📞</span>
            </div>
          </div>

          <div className="footer-col">
            <h3 className="footer-heading">OPENING HOURS</h3>
            <p className="footer-text">
              Mon – Sun: {openFormatted} – {closeFormatted}
            </p>
            {closingDays.length > 0 && (
              <p className="footer-text" style={{ color: '#E53935', fontSize: '0.85rem', marginTop: '4px' }}>
                Closed on: {closingDays.join(', ')}
              </p>
            )}
          </div>

          <div className="footer-col">
            <h3 className="footer-heading">ABOUT US</h3>
            <p className="footer-text">
              Your ultimate hangout spot for coffee, snacks & memories.
            </p>
            <p className="copyright-text">
              © {new Date().getFullYear()} {cafeSettings?.cafeName || 'YAARANA'}. All Rights Reserved.
            </p>
          </div>

        </div>

      </div>
    </footer>
  );
}