import React from 'react';
import coffeeImg from '../assets/hero.png';
import './HeroSection.css';

export default function HeroSection() {
  return (
    <section className="scroll-section hero-section" id="home">
      <div className="hero-card">
        
        {/* 1. Text Content Block */}
        <div className="hero-text-block">
          <h1 className="hero-main-heading">
            <span className="heading-line">BRING YOUR YAAR</span>
            <span className="pill-badge badge-green">COZY</span>
            <span className="heading-line">
              AT <span className="highlight-blue">YAARANA</span>
            </span>
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
        </div>

        {/* 2. Coffee Cups Illustration */}
        <div className="hero-image-wrapper">
          <img 
            src={coffeeImg} 
            alt="Yaarana Coffee Cups" 
            className="hero-coffee-image"
          />
        </div>

        {/* 3. Action Buttons */}
        <div className="hero-buttons">
          <button className="btn-order">ORDER NOW</button>
          <button className="btn-book">BOOK TABLE &gt;</button>
        </div>

      </div>
    </section>
  );
}