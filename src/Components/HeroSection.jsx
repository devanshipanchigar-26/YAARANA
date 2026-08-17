import React from 'react';
import coffeeImg from '../assets/hero.png';
import './HeroSection.css';

export default function HeroSection() {
  return (
    <section className="scroll-section hero-section" id="home">
      <div className="hero-card">
        <div className="hero-content">
          <h1 className="hero-main-heading">
            <span className="line-with-badge">
              BRING YOUR YAAR <span className="pill-badge badge-green">COZY</span>
            </span>
            <br />
            AT <span className="highlight-blue">YAARANA</span>
          </h1>

          <div className="hero-subblock">
            <span className="pill-badge badge-orange">TASTY</span>
            <h2 className="hero-secondary-heading">
              COFFEE, SNACKS &<br />
              CONVERSATIONS MADE<br />
              FROM THE HEART <span className="pill-badge badge-blue">FRESH</span>
            </h2>
          </div>

          <p className="hero-tagline">
            We're literally obsessed with giving your Yaar a reason to come back.
          </p>

          <div className="hero-buttons">
            <button className="btn-order">ORDER NOW</button>
            <button className="btn-book">BOOK TABLE &gt;</button>
          </div>
        </div>

        {/* Coffee Illustration Container */}
        <div className="hero-image-wrapper">
          <img 
            src={coffeeImg} 
            alt="Yaarana Coffee Cups" 
            className="hero-coffee-image"
          />
        </div>
      </div>
    </section>
  );
}