import React from 'react';
import { motion } from 'framer-motion';
import './About.css';


// Image Imports
import aboutImage from '../assets/about.png';
import juiceImage from '../assets/juice.png';
import juice1Image from '../assets/juice1.png';
import shakeImage from '../assets/shake.png';
import bobaImage from '../assets/boba.png'; // Mobile 4th Image

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
          <p>WELCOME TO YAARANA</p>

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
          <img src={aboutImage} alt="Y.A.A.R.A.N.A Cafe" />
        </div>

        <div className="intro-text">
          <span className="small-title">WELCOME!</span>
          <h2>Y.A.A.R.A.N.A CAFÉ</h2>
          <div className="blue-line"></div>

          <p>
            Y.A.A.R.A.N.A Café is a place where friendship, food and
            beautiful moments come together.
          </p>

          <p>
            Our café is designed to provide a warm and welcoming atmosphere
            where people can relax, enjoy delicious food and spend quality
            time with their friends and family.
          </p>

          <p>
            We focus on providing a pleasant café experience with good
            service, attractive ambience and enjoyable food.
          </p>

          <motion.button 
            className="visit-button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigate && onNavigate('menu')}
          >
            VISIT US
          </motion.button>
        </div>
      </motion.section>

      {/* WHY YAARANA SECTION */}
      <section className="why-section">
        <h2>WHY Y.A.A.R.A.N.A?</h2>

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
              <p>Delicious meals made with quality ingredients.</p>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="feature">
            <div className="icon">☕</div>
            <div className="feature-info">
              <h3>COZY AMBIENCE</h3>
              <p>A comfortable place to relax, study, work and hang out.</p>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="feature">
            <div className="icon">💛</div>
            <div className="feature-info">
              <h3>GOOD TIMES</h3>
              <p>Great coffee, great vibes and great memories.</p>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* GALLERY SECTION (IMAGES ONLY) */}
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
            Whether it's a coffee break, a meal with friends or a special
            celebration, Y.A.A.R.A.N.A is always here to make every moment
            memorable.
          </p>
        </div>

        {/* GALLERY GRID */}
        <div className="gallery">
          <div className="gallery-card">
            <img src={juiceImage} alt="Juice at Y.A.A.R.A.N.A" />
          </div>

          <div className="gallery-card">
            <img src={juice1Image} alt="Drink at Y.A.A.R.A.N.A" />
          </div>

          <div className="gallery-card">
            <img src={shakeImage} alt="Shake at Y.A.A.R.A.N.A" />
          </div>

          {/* 4th Image - Mobile Only */}
          <div className="gallery-card mobile-only-card">
            <img src={bobaImage} alt="Boba at Y.A.A.R.A.N.A" />
          </div>
        </div>
      </motion.section>

      {/* SEPARATE BOTTOM CARD (NO BORDER) */}
      <motion.div 
        className="see-you-banner"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2>SEE YOU AT Y.A.A.R.A.N.A! ♡</h2>
        <p>Bring your friends and make great memories with us today.</p>
      </motion.div>

    </div>
  );
}

export default About;
