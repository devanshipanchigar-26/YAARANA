import React from 'react';
import HeroSection from '../Components/HeroSection';
import OurStory from '../Components/OurStory';
import OurSpecials from '../Components/OurSpecials';
import GalleryFooter from '../Components/GalleryFooter';
import './HomePage.css';

export default function HomePage({ onNavigate }) {
  return (
    <div className="homepage-container">
      <HeroSection onNavigate={onNavigate} />
      <OurSpecials />
      <OurStory />
      <GalleryFooter />
    </div>
  );
}