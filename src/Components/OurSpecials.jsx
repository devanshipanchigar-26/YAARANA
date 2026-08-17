import React, { useState, useRef } from 'react';
import badgeCupImg from '../assets/badge-cup.png';
import './OurSpecials.css';

const specialsData = [
  { 
    id: 1, 
    name: "Coffee", 
    image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80" 
  },
  { 
    id: 2, 
    name: "Fries", 
    image: "https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=600&q=80" 
  },
  { 
    id: 3, 
    name: "Waffles", 
    image: "https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=600&q=80" 
  },
  { 
    id: 4, 
    name: "Burgers", 
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80" 
  },
  { 
    id: 5, 
    name: "Shakes", 
    image: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80" 
  },
  { 
    id: 6, 
    name: "Sandwiches", 
    image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80" 
  }
];

// Tripled list to allow smooth, continuous infinite looping in both directions
const extendedItems = [...specialsData, ...specialsData, ...specialsData];

export default function OurSpecials() {
  const [currentIndex, setCurrentIndex] = useState(specialsData.length); // Starts at middle set
  const [isTransitioning, setIsTransitioning] = useState(true);
  const isMoving = useRef(false);

  const handleNext = () => {
    if (isMoving.current) return;
    isMoving.current = true;
    setIsTransitioning(true);
    setCurrentIndex((prev) => prev + 1);
  };

  const handlePrev = () => {
    if (isMoving.current) return;
    isMoving.current = true;
    setIsTransitioning(true);
    setCurrentIndex((prev) => prev - 1);
  };

  // Seamless jump when reaching buffer boundaries without rewind animation
  const handleTransitionEnd = () => {
    isMoving.current = false;
    if (currentIndex >= specialsData.length * 2) {
      setIsTransitioning(false);
      setCurrentIndex(currentIndex - specialsData.length);
    } else if (currentIndex < specialsData.length) {
      setIsTransitioning(false);
      setCurrentIndex(currentIndex + specialsData.length);
    }
  };

  return (
    <section className="scroll-section specials-section" id="specials">
      <div className="specials-container">
        
        {/* Section Header */}
        <div className="specials-header">
          <div className="circular-badge">
            <svg viewBox="0 0 100 100">
              <path id="circlePath" d="M 50, 50 m -36, 0 a 36,36 0 1,1 72,0 a 36,36 0 1,1 -72,0" fill="none" />
              <text fontSize="11" fontWeight="800" fill="#3D271D" letterSpacing="1">
                <textPath href="#circlePath">TASTY TREATS FOR EVERY YAAR • </textPath>
              </text>
            </svg>
            <div className="badge-center-icon">
              <img src={badgeCupImg} alt="Yaarana Cup Icon" className="badge-cup-img" />
            </div>
          </div>
          <h2 className="section-title">OUR SPECIALS</h2>
        </div>

        {/* Carousel */}
        <div className="carousel-wrapper">
          
          {/* Big Rounded Left Arrow */}
          <button className="arrow-btn left-arrow" onClick={handlePrev} aria-label="Previous Special">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>

          {/* Masked Viewport */}
          <div className="specials-viewport">
            <div 
              className="specials-track"
              onTransitionEnd={handleTransitionEnd}
              style={{
                transform: `translateX(calc(-${currentIndex} * ((100% + 40px) / 3)))`,
                transition: isTransitioning ? 'transform 0.45s cubic-bezier(0.25, 1, 0.5, 1)' : 'none'
              }}
            >
              {extendedItems.map((item, index) => (
                <div className="item-card" key={`${item.id}-${index}`}>
                  <div className="image-frame">
                    <img src={item.image} alt={item.name} />
                  </div>
                  <h3>{item.name}</h3>
                </div>
              ))}
            </div>
          </div>

          {/* Big Rounded Right Arrow */}
          <button className="arrow-btn right-arrow" onClick={handleNext} aria-label="Next Special">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>

        </div>

        {/* View Full Menu CTA Button */}
        <div className="specials-bottom-action">
          <button className="btn-view-menu">VIEW FULL MENU &gt;</button>
        </div>

      </div>
    </section>
  );
}