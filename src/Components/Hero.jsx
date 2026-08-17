// import React from "react";
// import Navbar from "./Navbar";
// import "./Hero.css";

// export default function App() {
//   return (
//     <div className="homepage-container">
//       {/* Sticky Top Navbar */}
//       <div className="navbar-wrapper">
//         <Navbar />
//       </div>

//       {/* Main Full-Screen Scroll Viewport */}
//       <main className="scroll-container">
//         {/* SECTION 1: HERO */}
//         <section className="scroll-section hero-section" id="home">
//           <div className="hero-card">
//             <div className="hero-content">
//               <h1 className="hero-main-heading">
//                 <span className="line-with-badge">
//                   BRING YOUR YAAR <span className="pill-badge badge-green">COZY</span>
//                 </span>
//                 <br />
//                 AT <span className="highlight-blue">YAARANA</span>
//               </h1>

//               <div className="hero-subblock">
//                 <span className="pill-badge badge-orange">TASTY</span>
//                 <h2 className="hero-secondary-heading">
//                   COFFEE, SNACKS &<br />
//                   CONVERSATIONS MADE<br />
//                   FROM THE HEART <span className="pill-badge badge-blue">FRESH</span>
//                 </h2>
//               </div>

//               <p className="hero-tagline">
//                 We're literally obsessed with giving your Yaar a reason to come back.
//               </p>

//               <div className="hero-buttons">
//                 <button className="btn-order">ORDER NOW</button>
//                 <button className="btn-book">BOOK TABLE &gt;</button>
//               </div>
//             </div>

//             <div className="hero-image-wrapper">
//               <img 
//                 src="https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80" 
//                 alt="Yaarana Cafe Vibe" 
//                 className="hero-custom-image"
//               />
//             </div>
//           </div>
//         </section>

//         {/* SECTION 2: OUR SPECIALS */}
//         <section className="scroll-section specials-section" id="specials">
//           <div className="specials-header">
//             <div className="circular-badge">
//               <svg viewBox="0 0 100 100">
//                 <path id="circlePath" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0" fill="none" />
//                 <text fontSize="9.5" fontWeight="bold" fill="#3D271D">
//                   <textPath href="#circlePath">TASTY TREATS FOR EVERY YAAR • </textPath>
//                 </text>
//               </svg>
//               <div className="badge-center-icon">☕</div>
//             </div>
//             <h2 className="section-title">OUR SPECIALS</h2>
//           </div>

//           <div className="carousel-wrapper">
//             <button className="arrow-btn left-arrow">&lt;</button>

//             <div className="cards-grid">
//               <div className="item-card">
//                 <div className="image-frame">
//                   <img src="https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80" alt="Coffee" />
//                 </div>
//                 <h3>Coffee</h3>
//               </div>

//               <div className="item-card">
//                 <div className="image-frame">
//                   <img src="https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=600&q=80" alt="Fries" />
//                 </div>
//                 <h3>Fries</h3>
//               </div>

//               <div className="item-card">
//                 <div className="image-frame">
//                   <img src="https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=600&q=80" alt="Waffles" />
//                 </div>
//                 <h3>Waffles</h3>
//               </div>
//             </div>

//             <button className="arrow-btn right-arrow">&gt;</button>
//           </div>
//         </section>

//         {/* SECTION 3: OUR STORY */}
//         <section className="scroll-section story-section" id="story">
//           <h2 className="section-title">OUR STORY</h2>
//           <div className="story-card">
//             <p className="story-text">
//               Born out of warm coffee cups, sizzling snacks, and endless banter, 
//               <strong> YAARANA</strong> was created to give you and your favorite group of friends a place to call home. 
//             </p>
//             <p className="story-subtext">
//               Whether you're grabbing a quick morning brew or hanging out for hours, every recipe on our menu is crafted from the heart.
//             </p>
//           </div>
//         </section>

//         {/* SECTION 4: GALLERY */}
//         <section className="scroll-section gallery-section" id="gallery">
//           <h2 className="section-title">GALLERY</h2>
//           <div className="gallery-grid">
//             <div className="gallery-item">
//               <img src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80" alt="Cafe ambiance" />
//             </div>
//             <div className="gallery-item">
//               <img src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80" alt="Special Coffee" />
//             </div>
//             <div className="gallery-item">
//               <img src="https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80" alt="Snacks and bites" />
//             </div>
//           </div>
//         </section>

//         {/* SECTION 5: FOOTER & CONTACT */}
//         <section className="scroll-section footer-section" id="contact">
//           <div className="footer-content">
//             <div className="footer-columns">
//               <div className="footer-col">
//                 <h4 className="footer-heading">Address</h4>
//                 <div className="address-item">
//                   <span className="location-pin">📍</span>
//                   <p>123 Yaarana Street, Foodie Hub, City</p>
//                 </div>
//               </div>

//               <div className="footer-col">
//                 <h4 className="footer-heading">Opening Hours</h4>
//                 <p>Mon - Sun: 10:00 AM - 11:00 PM</p>
//               </div>

//               <div className="footer-col">
//                 <h4 className="footer-heading">About Us</h4>
//                 <p>Your ultimate hangout spot for coffee, snacks & memories.</p>
//               </div>
//             </div>

//             <div className="footer-bottom">
//               <div className="footer-social-icons">
//                 <a href="#instagram" aria-label="Instagram">📸</a>
//                 <a href="#whatsapp" aria-label="WhatsApp">💬</a>
//                 <a href="#email" aria-label="Email">✉️</a>
//                 <a href="#phone" aria-label="Phone">📞</a>
//               </div>
//               <p className="copyright">© 2026 YAARANA. All Rights Reserved.</p>
//             </div>
//           </div>
//         </section>
//       </main>
//     </div>
//   );
// }