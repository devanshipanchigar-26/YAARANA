import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useCafeSettings } from '../utils/cafeSettings';
import { supabase } from '../supabaseClient';
import './About.css';

// Local Image Imports (clean fallbacks)
import aboutImage from '../assets/about.png';
import juiceImage from '../assets/juice.png';
import juice1Image from '../assets/juice1.png';
import shakeImage from '../assets/shake.png';
import bobaImage from '../assets/boba.png';

// Staggered Entrance Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" } 
  },
};

function About({ onNavigate }) {
  const [cafeSettings] = useCafeSettings();
  const [galleryPhotos, setGalleryPhotos] = useState([]);
  const [menuCount, setMenuCount] = useState(null);

  // Fetch live gallery photos & available menu count from Supabase database
  useEffect(() => {
    let isMounted = true;

    async function loadDatabaseContent() {
      try {
        // 1. Fetch approved customer gallery exhibition photos from Supabase
        const { data: photoData, error: photoError } = await supabase
          .from('reviews')
          .select('id, customer_name, image_url, comment, rating')
          .eq('status', 'approved')
          .eq('is_featured_in_gallery', true)
          .order('created_at', { ascending: false })
          .limit(4);

        if (!photoError && photoData && photoData.length > 0 && isMounted) {
          setGalleryPhotos(photoData);
        }

        // 2. Fetch live available menu items count from Supabase
        const { count, error: countError } = await supabase
          .from('menu_items')
          .select('*', { count: 'exact', head: true })
          .eq('is_available', true);

        if (!countError && typeof count === 'number' && count > 0 && isMounted) {
          setMenuCount(count);
        }
      } catch (err) {
        console.warn('About page database fetch fallback:', err);
      }
    }

    loadDatabaseContent();
    return () => { isMounted = false; };
  }, []);

  const cafeName = cafeSettings?.cafeName || 'Y.A.A.R.A.N.A CAFÉ';
  const tagline = cafeSettings?.tagline || 'WELCOME TO YAARANA';
  const customStory = cafeSettings?.aboutStory?.trim();

  // Fallback images array
  const fallbackImages = [
    { id: 'fb1', url: juiceImage, alt: 'Fresh Juice at YAARANA' },
    { id: 'fb2', url: juice1Image, alt: 'Specialty Drink at YAARANA' },
    { id: 'fb3', url: shakeImage, alt: 'Velvety Shake at YAARANA' },
    { id: 'fb4', url: bobaImage, alt: 'Signature Boba at YAARANA' },
  ];

  // If database photos exist, map them; otherwise use local assets
  const displayPhotos = (galleryPhotos.length > 0
    ? galleryPhotos.map((p, idx) => ({
        id: p.id,
        url: p.image_url,
        alt: p.customer_name ? `Photo by ${p.customer_name}` : 'YAARANA Cafe Moment',
        isMobileOnly: idx === 3,
      }))
    : fallbackImages.map((img, idx) => ({
        id: img.id,
        url: img.url,
        alt: img.alt,
        isMobileOnly: idx === 3,
      }))
  );

  return (
    <div className="about-page">

      {/* HERO HEADER */}
      <motion.header 
        className="hero"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7 }}
      >
        <div className="hero-content">
          <h1>ABOUT US</h1>
          <p>{tagline.toUpperCase()}</p>

          <div className="hero-decoration">
            <span></span>
            ★
            <span></span>
          </div>
        </div>
      </motion.header>

      {/* INTRO SECTION */}
      <motion.section 
        className="intro-section"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
      >
        <div className="image-box">
          <img src={aboutImage} alt={`${cafeName}`} />
        </div>

        <div className="intro-text">
          <span className="small-title">WELCOME!</span>
          <h2>{cafeName.toUpperCase()}</h2>
          <div className="blue-line"></div>

          {customStory ? (
            customStory.split('\n\n').map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))
          ) : (
            <>
              <p>
                {cafeName} is a vibrant hangout where genuine friendship, delicious culinary creations, and warm memories come together.
              </p>
              <p>
                Our café is designed to provide a warm and welcoming atmosphere where people can relax, enjoy freshly brewed coffee, tasty treats, and spend quality time with their friends and family.
              </p>
              <p>
                We focus on delivering a pleasant café experience with heartfelt hospitality, an attractive aesthetic ambience, and handcrafted food.
              </p>
            </>
          )}

          <motion.button 
            className="visit-button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigate && onNavigate('menu')}
          >
            VISIT OUR MENU {menuCount ? `(${menuCount}+ ITEMS)` : ''}
          </motion.button>
        </div>
      </motion.section>

      {/* WHY YAARANA SECTION */}
      <section className="why-section">
        <h2>WHY {cafeName.toUpperCase()}?</h2>

        <div className="yellow-line">
          <span></span>
          ★
          <span></span>
        </div>

        <motion.div 
          className="features"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.div variants={itemVariants} className="feature">
            <div className="icon">🍔</div>
            <div className="feature-info">
              <h3>GOOD FOOD</h3>
              <p>{menuCount ? `${menuCount}+ freshly made culinary choices prepared with love.` : 'Delicious meals made with quality ingredients.'}</p>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="feature">
            <div className="icon">☕</div>
            <div className="feature-info">
              <h3>COZY AMBIENCE</h3>
              <p>A comfortable place to relax, study, work, and hang out with friends.</p>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="feature">
            <div className="icon">💛</div>
            <div className="feature-info">
              <h3>GOOD TIMES</h3>
              <p>Artisan coffee, delightful sips, vibrant music, and great memories.</p>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* GALLERY / MOMENT SECTION (CONNECTS TO SUPABASE GALLERY PHOTOS) */}
      <motion.section 
        className="moment-section"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="moment-text">
          <h2>
            A PLACE FOR<br />EVERY MOMENT
          </h2>

          <div className="blue-line"></div>

          <p>
            Whether it's a quick coffee break, a feast with friends, or a memorable celebration, {cafeName} is always here to make every moment unforgettable.
          </p>
        </div>

        {/* GALLERY GRID */}
        <div className="gallery">
          {displayPhotos.map((photo) => (
            <div
              key={photo.id}
              className={`gallery-card ${photo.isMobileOnly ? 'mobile-only-card' : ''}`}
            >
              <img src={photo.url} alt={photo.alt} />
            </div>
          ))}
        </div>
      </motion.section>

      {/* BOTTOM BANNER */}
      <motion.div 
        className="see-you-banner"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2>SEE YOU AT {cafeName.toUpperCase()}! ♡</h2>
        <p>Bring your friends and make extraordinary memories with us today.</p>
      </motion.div>

    </div>
  );
}

export default About;
