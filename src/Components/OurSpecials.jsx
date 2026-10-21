import React, { useState, useRef, useEffect, useMemo } from 'react';
import badgeCupImg from '../assets/badge-cup.png';
import { supabase } from '../supabaseClient';
import { useCart } from '../context/CartContext';
import './OurSpecials.css';

// Curated fallbacks in case remote database is loading, offline, or unpopulated
const defaultFallbackSpecials = [
  { 
    id: 'f-1', 
    name: "Classic Brew", 
    badge: "Chef Special",
    price: 120,
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80" 
  },
  { 
    id: 'f-2', 
    name: "Crispy Peri Fries", 
    badge: "Trending",
    price: 110,
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=600&q=80" 
  },
  { 
    id: 'f-3', 
    name: "Belgian Waffles", 
    badge: "Must Try",
    price: 180,
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=600&q=80" 
  },
  { 
    id: 'f-4', 
    name: "Gourmet Burgers", 
    badge: "Bestseller",
    price: 160,
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80" 
  },
  { 
    id: 'f-5', 
    name: "Thick Shakes", 
    badge: "Popular",
    price: 140,
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80" 
  },
  { 
    id: 'f-6', 
    name: "Artisan Sandwiches", 
    badge: "Chef Special",
    price: 130,
    isAvailable: true,
    image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80" 
  }
];

export default function OurSpecials({ onNavigate }) {
  const [specialsList, setSpecialsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stepDistance, setStepDistance] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [addedItemNotice, setAddedItemNotice] = useState(null);

  const { addToCart, openCart } = useCart();
  const isMoving = useRef(false);
  const viewportRef = useRef(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // 1. Fetch live specials from Supabase (visible items only)
  useEffect(() => {
    let isMounted = true;

    const fetchSpecials = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('specials')
          .select(`
            id,
            title,
            description,
            image_url,
            badge_text,
            display_order,
            is_visible,
            is_available,
            menu_item_id,
            menu_items (
              id,
              name,
              price,
              emoji,
              is_available
            )
          `)
          .eq('is_visible', true)
          .order('display_order', { ascending: true });

        if (error) {
          // If table doesn't exist yet, fallback silently
          console.warn('Could not fetch specials from database, using fallback:', error.message);
          if (isMounted) setSpecialsList(defaultFallbackSpecials);
        } else if (data && data.length > 0) {
          const formatted = data.map((item) => ({
            id: item.id,
            name: item.title,
            badge: item.badge_text,
            description: item.description,
            image: item.image_url || 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80',
            menuItem: item.menu_items,
            price: item.menu_items?.price != null ? item.menu_items.price : null,
            // Availability strictly enforces both special flag and underlying menu_item in-stock flag
            isAvailable: Boolean(
              item.is_available && (!item.menu_items || item.menu_items.is_available !== false)
            ),
          }));
          if (isMounted) setSpecialsList(formatted);
        } else {
          // Empty in DB -> fallback
          if (isMounted) setSpecialsList(defaultFallbackSpecials);
        }
      } catch (err) {
        console.error('Error in OurSpecials fetch:', err);
        if (isMounted) setSpecialsList(defaultFallbackSpecials);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSpecials();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Prepare items extended for continuous carousel looping
  const activeItems = specialsList.length > 0 ? specialsList : defaultFallbackSpecials;
  const loopMultiplier = activeItems.length < 3 ? 4 : 3;

  const extendedItems = useMemo(() => {
    let result = [];
    for (let i = 0; i < loopMultiplier; i++) {
      result = result.concat(activeItems);
    }
    return result;
  }, [activeItems, loopMultiplier]);

  const [currentIndex, setCurrentIndex] = useState(activeItems.length);

  // Sync index when active items count changes
  useEffect(() => {
    setCurrentIndex(activeItems.length);
  }, [activeItems.length]);

  // 3. Carousel step distance calculations
  useEffect(() => {
    const updateDistance = () => {
      if (viewportRef.current) {
        const card = viewportRef.current.querySelector('.item-card');
        if (card) {
          const gap = window.innerWidth <= 900 ? 20 : 40;
          setStepDistance(card.offsetWidth + gap);
        }
      }
    };

    updateDistance();
    const timer = setTimeout(updateDistance, 150);
    window.addEventListener('resize', updateDistance);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateDistance);
    };
  }, [extendedItems]);

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

  const handleTransitionEnd = () => {
    isMoving.current = false;
    if (currentIndex >= activeItems.length * 2) {
      setIsTransitioning(false);
      setCurrentIndex(currentIndex - activeItems.length);
    } else if (currentIndex < activeItems.length) {
      setIsTransitioning(false);
      setCurrentIndex(currentIndex + activeItems.length);
    }
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      handleNext();
    } else if (distance < -minSwipeDistance) {
      handlePrev();
    }

    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  // 4. Cart Interaction using authoritative product identity
  const handleAddToCart = (item) => {
    if (!item.isAvailable) return;

    if (item.menuItem) {
      // Authoritative product payload ensures no duplicate items or mismatched prices
      addToCart({
        id: item.menuItem.id,
        name: item.menuItem.name,
        price: Number(item.menuItem.price) || 0,
        emoji: item.menuItem.emoji || '',
      });

      // Quick visual feedback notification
      setAddedItemNotice(item.name);
      setTimeout(() => setAddedItemNotice(null), 2500);
    } else if (onNavigate) {
      onNavigate('menu');
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
          <div className="header-text-group">
            <h2 className="title-our">OUR</h2>
            <h2 className="title-specials">SPECIALS</h2>
          </div>
        </div>

        {/* Floating Cart Feedback Banner */}
        {addedItemNotice && (
          <div 
            style={{
              background: '#311E18',
              color: '#FFD000',
              fontFamily: "'Luckiest Guy', cursive",
              padding: '8px 20px',
              borderRadius: '25px',
              fontSize: '0.95rem',
              letterSpacing: '0.5px',
              marginBottom: '14px',
              boxShadow: '0 4px 15px rgba(61, 39, 29, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              animation: 'fadeIn 0.2s ease-in-out'
            }}
          >
            <span>🎉 Added "{addedItemNotice}" to Cart!</span>
            <button
              onClick={() => openCart && openCart('cart')}
              style={{
                background: '#FFD000',
                color: '#311E18',
                border: 'none',
                padding: '4px 12px',
                borderRadius: '12px',
                fontFamily: 'inherit',
                fontSize: '0.75rem',
                cursor: 'pointer'
              }}
            >
              View Cart →
            </button>
          </div>
        )}

        {/* Carousel */}
        <div className="carousel-wrapper">
          <button className="arrow-btn left-arrow" onClick={handlePrev} aria-label="Previous Special">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>

          <div 
            ref={viewportRef}
            className="specials-viewport"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div 
              className="specials-track"
              onTransitionEnd={handleTransitionEnd}
              style={{
                transform: stepDistance ? `translateX(-${currentIndex * stepDistance}px)` : 'none',
                transition: isTransitioning ? 'transform 0.45s cubic-bezier(0.25, 1, 0.5, 1)' : 'none'
              }}
            >
              {extendedItems.map((item, index) => (
                <div className="item-card" key={`${item.id}-${index}`}>
                  <div className="image-frame">
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80';
                      }}
                    />
                  </div>
                  
                  {item.badge && (
                    <div>
                      <span className="special-card-badge">{item.badge}</span>
                    </div>
                  )}

                  <h3>{item.name}</h3>

                  <div className="special-card-meta">
                    {item.price != null && (
                      <span className="special-card-price">₹{item.price}</span>
                    )}

                    {item.menuItem ? (
                      item.isAvailable ? (
                        <button
                          type="button"
                          className="special-card-add-btn"
                          onClick={() => handleAddToCart(item)}
                          aria-label={`Add ${item.name} to cart`}
                        >
                          ADD +
                        </button>
                      ) : (
                        <span className="special-card-soldout">Sold Out</span>
                      )
                    ) : (
                      <button
                        type="button"
                        className="special-card-add-btn"
                        onClick={() => onNavigate && onNavigate('menu')}
                        aria-label="Explore menu"
                      >
                        EXPLORE →
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button className="arrow-btn right-arrow" onClick={handleNext} aria-label="Next Special">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>

        {/* View Full Menu CTA Button */}
        <div className="specials-bottom-action">
          <button className="btn-view-menu" onClick={() => onNavigate && onNavigate('menu')}>
            VIEW FULL MENU &gt;
          </button>
        </div>

      </div>
    </section>
  );
}