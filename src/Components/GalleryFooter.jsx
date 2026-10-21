import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useCafeSettings } from '../utils/cafeSettings';
import SocialIcons from './SocialIcons';
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

const fallbackRow1 = [
  { id: 'f1', title: "Cozy Corner", comment: "The ultimate cozy corner to unwind with warm memories.", rating: 5, customerName: "YAARANA Vibes", url: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&q=80" },
  { id: 'f2', title: "Artisan Coffee", comment: "Freshly roasted beans brewed to absolute perfection.", rating: 5, customerName: "Coffee Special", url: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80" },
  { id: 'f3', title: "Crispy Treats", comment: "Cheesy, crispy, and baked with pure culinary passion.", rating: 5, customerName: "Chef's Special", url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80" }
];

const fallbackRow2 = [
  { id: 'f4', title: "Sweet Waffles", comment: "Golden crisp outside, warm and fluffy on the inside.", rating: 5, customerName: "Sweet Moments", url: "https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=600&q=80" },
  { id: 'f5', title: "Friends Hangout", comment: "Great food tastes even better when shared with friends.", rating: 5, customerName: "Yaari Forever", url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80" },
  { id: 'f6', title: "Chilled Shakes", comment: "Rich chocolate goodness topped with velvety whipped cream.", rating: 5, customerName: "Chilled Sips", url: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80" }
];

export default function GalleryFooter() {
  const [cafeSettings] = useCafeSettings();
  const [customerPhotos, setCustomerPhotos] = useState([]);

  // Fetch approved customer photos that are marked for gallery exhibition
  useEffect(() => {
    const fetchGalleryPhotos = async () => {
      try {
        const { data, error } = await supabase
          .from('reviews')
          .select('id, customer_name, image_url, comment, rating')
          .eq('status', 'approved')
          .eq('is_featured_in_gallery', true)
          .not('image_url', 'is', null)
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          const formatted = data.map((item) => ({
            id: `guest-${item.id}`,
            title: `${item.customer_name}'s Photo`,
            url: item.image_url,
            isCustomer: true,
            customerName: item.customer_name,
            rating: item.rating || 5,
            comment: item.comment || item.review_text || 'Great dining experience at YAARANA!',
          }));
          setCustomerPhotos(formatted);
        }
      } catch (err) {
        console.warn('Could not fetch guest gallery photos:', err);
      }
    };

    fetchGalleryPhotos();
  }, []);

  // Assemble the display sets: prioritize real guest photos while keeping fallback frames
  let row1Items = fallbackRow1;
  let row2Items = fallbackRow2;

  if (customerPhotos.length > 0) {
    // If guest photos exist, combine them with fallback photos
    const combined = [...customerPhotos, ...fallbackRow1, ...fallbackRow2];
    const half = Math.ceil(combined.length / 2);
    row1Items = combined.slice(0, half);
    row2Items = combined.slice(half);
  }

  const infiniteRow1 = [...row1Items, ...row1Items, ...row1Items];
  const infiniteRow2 = [...row2Items, ...row2Items, ...row2Items];

  const openFormatted = formatTime12(cafeSettings?.openingTime || '10:00');
  const closeFormatted = formatTime12(cafeSettings?.closingTime || '23:00');
  const closingDays = cafeSettings?.weeklyClosingDays || [];

  return (
    <footer className="scroll-section gallery-footer-section" id="contact">
      <div className="gallery-container">
        
        <div className="gallery-header">
          <h2 className="gallery-title">GALLERY</h2>
          {customerPhotos.length > 0 && (
            <p style={{ textAlign: 'center', color: '#B39D82', margin: '4px 0 0', fontSize: '0.9rem', fontWeight: '500' }}>
              📸 Featuring Moments Captured by YAARANA Guests
            </p>
          )}
        </div>

        {/* Dual Track Marquee Carousels */}
        <div className="gallery-carousels-wrapper">
          
          {/* Row 1: Moves Left */}
          <div className="gallery-carousel-viewport">
            <div className="gallery-scroll-track track-left">
              {infiniteRow1.map((item, index) => (
                <div className="gallery-frame" key={`r1-${item.id}-${index}`}>
                  <img
                    src={item.url}
                    alt={item.title}
                    className="gallery-img"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&q=80';
                    }}
                  />
                  <div className="gallery-hover-overlay">
                    <div className="gallery-hover-stars">
                      {'⭐'.repeat(item.rating || 5)}
                    </div>
                    <p className="gallery-hover-comment">
                      "{item.comment || 'A delicious memory made at YAARANA!'}"
                    </p>
                    <p className="gallery-hover-author">
                      — {item.customerName || item.title || 'YAARANA Guest'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Row 2: Moves Right */}
          <div className="gallery-carousel-viewport">
            <div className="gallery-scroll-track track-right">
              {infiniteRow2.map((item, index) => (
                <div className="gallery-frame" key={`r2-${item.id}-${index}`}>
                  <img
                    src={item.url}
                    alt={item.title}
                    className="gallery-img"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80';
                    }}
                  />
                  <div className="gallery-hover-overlay">
                    <div className="gallery-hover-stars">
                      {'⭐'.repeat(item.rating || 5)}
                    </div>
                    <p className="gallery-hover-comment">
                      "{item.comment || 'A delicious memory made at YAARANA!'}"
                    </p>
                    <p className="gallery-hover-author">
                      — {item.customerName || item.title || 'YAARANA Guest'}
                    </p>
                  </div>
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
                <span className="location-icon">📞</span>
                <a
                  href={`tel:${cafeSettings.contactNumber.replace(/[^0-9+]/g, '')}`}
                  className="footer-phone-link"
                  title={`Call ${cafeSettings.contactNumber} in Phone app`}
                >
                  {cafeSettings.contactNumber}
                </a>
              </p>
            )}
            <SocialIcons settings={cafeSettings} size={18} />
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