import React from 'react';
import HeroSection from '../Components/HeroSection';
import OurStory from '../Components/OurStory';
import OurSpecials from '../Components/OurSpecials';
import GalleryFooter from '../Components/GalleryFooter';
import './HomePage.css';

export default function HomePage() {
  return (
    <div className="homepage-container">
      <HeroSection />
      <OurSpecials />
      <OurStory />
      <GalleryFooter />
    </div>
  );
}