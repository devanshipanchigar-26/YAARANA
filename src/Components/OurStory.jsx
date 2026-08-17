import React from 'react';
import beansLineImg from '../assets/beans-line.png';
import './OurStory.css';

export default function OurStory() {
  return (
    <section className="scroll-section story-section" id="story">
      <div className="story-dark-card">
        
        {/* Left Photo */}
        <div className="story-image-wrapper">
          <div className="story-image-box">
            <img 
              src="https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1000&q=80" 
              alt="Yaarana Cafe Ambiance" 
              className="story-img" 
            />
          </div>
        </div>

        {/* Right Content Area */}
        <div className="story-content">
          <h2 className="story-heading">
            HOW WAS <span className="highlight-text">YAARANA</span> BORN ?
          </h2>

          <p className="story-paragraph-primary">
            Born out of warm coffee cups, sizzling snacks, and endless banter, <strong>YAARANA</strong> was created to give you and your favorite group of friends a place to call home.
          </p>

          <p className="story-paragraph-secondary">
            Whether you're grabbing a quick morning brew or hanging out for hours, every recipe on our menu is crafted from the heart to bring people together.
          </p>

          <div className="story-action-row">
            <button className="btn-story-cta">KNOW MORE</button>
          </div>
        </div>

        {/* Bottom Right Coffee Beans Line Art */}
        <div className="story-beans-wrapper">
          <img 
            src={beansLineImg} 
            alt="Coffee Beans Line Art" 
            className="story-beans-img"
          />
        </div>

      </div>
    </section>
  );
}