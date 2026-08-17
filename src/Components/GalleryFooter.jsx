import React from 'react';
import './GalleryFooter.css';

const galleryImages = [
  { id: 1, title: "Cozy Corner", url: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&q=80" },
  { id: 2, title: "Artisan Coffee", url: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80" },
  { id: 3, title: "Crispy Treats", url: "https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=600&q=80" },
  { id: 4, title: "Sweet Waffles", url: "https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=600&q=80" },
  { id: 5, title: "Friends Hangout", url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80" },
  { id: 6, title: "Chilled Shakes", url: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80" }
];

export default function GalleryFooter() {
  const infiniteGallery = [...galleryImages, ...galleryImages];

  return (
    <footer className="scroll-section gallery-footer-section" id="gallery">
      <div className="gallery-container">
        
        <div className="gallery-header">
          <h2 className="gallery-title">GALLERY</h2>
        </div>

        <div className="gallery-carousel-viewport">
          <div className="gallery-scroll-track">
            {infiniteGallery.map((item, index) => (
              <div className="gallery-frame" key={`${item.id}-${index}`}>
                <img src={item.url} alt={item.title} className="gallery-img" />
              </div>
            ))}
          </div>
        </div>

        <div className="footer-info-grid">
          
          <div className="footer-col">
            <h3 className="footer-heading">ADDRESS</h3>
            <p className="footer-text">
              <span className="location-icon">📍</span> 123 Yaarana Street, Foodie Hub, City
            </p>
            <div className="social-icons">
              <span className="icon">📷</span>
              <span className="icon">💬</span>
              <span className="icon">✉️</span>
              <span className="icon">📞</span>
            </div>
          </div>

          <div className="footer-col">
            <h3 className="footer-heading">OPENING HOURS</h3>
            <p className="footer-text">Mon – Sun: 10:00 AM – 11:00 PM</p>
          </div>

          <div className="footer-col">
            <h3 className="footer-heading">ABOUT US</h3>
            <p className="footer-text">
              Your ultimate hangout spot for coffee, snacks & memories.
            </p>
            <p className="copyright-text">© 2026 YAARANA. All Rights Reserved.</p>
          </div>

        </div>

      </div>
    </footer>
  );
}