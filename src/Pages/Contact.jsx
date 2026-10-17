import React, { useState } from "react";
import { motion } from "framer-motion";
import "./Contact.css";

function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    message: ""
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Form Submitted:", formData);
    alert("Thank you! Your message has been received.");
    setFormData({
      name: "",
      contact: "",
      message: ""
    });
  };

  return (
    <div className="contact-page">
      {/* HEADER */}
      <motion.header
        className="contact-hero"
        initial={{
          opacity: 0,
          scale: 0.95
        }}
        animate={{
          opacity: 1,
          scale: 1
        }}
        transition={{
          duration: 0.7
        }}
      >
        <div className="contact-hero-content">
          <h1>CONTACT US</h1>
          <p>SAY HELLO TO YAARANA</p>
          <div className="contact-hero-decoration">
            <span></span>
            ★
            <span></span>
          </div>
        </div>
      </motion.header>

      {/* HOURS */}
      <motion.section
        className="contact-info-section"
        initial={{
          opacity: 0,
          y: 30
        }}
        whileInView={{
          opacity: 1,
          y: 0
        }}
        viewport={{
          once: true
        }}
      >
        <div className="contact-info-card">
          <span className="contact-card-badge">OPENING HOURS</span>
          <h2>COME VISIT US</h2>
          <div className="contact-blue-line"></div>

          <div className="contact-hours-list">
            <div className="contact-hours-row">
              <span>Mon - Thu:</span>
              <strong>10:00 AM – 11:00 PM</strong>
            </div>

            <div className="contact-hours-row">
              <span>Fri - Sun:</span>
              <strong>10:00 AM – 11:30 PM</strong>
            </div>
          </div>
        </div>
      </motion.section>

      {/* FORM */}
      <motion.section
        className="contact-form-section"
        initial={{
          opacity: 0,
          y: 30
        }}
        whileInView={{
          opacity: 1,
          y: 0
        }}
        viewport={{
          once: true
        }}
      >
        <div className="contact-form-card">
          <span className="contact-card-badge">SEND A MESSAGE</span>
          <h2>DROP A LINE</h2>
          <div className="contact-blue-line"></div>

          <form onSubmit={handleSubmit} className="contact-form">
            <div className="contact-form-group">
              <label htmlFor="contact-name">YOUR NAME</label>
              <input
                id="contact-name"
                type="text"
                name="name"
                placeholder="Enter your name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="contact-form-group">
              <label htmlFor="contact-details">PHONE OR EMAIL</label>
              <input
                id="contact-details"
                type="text"
                name="contact"
                placeholder="How can we reach you?"
                value={formData.contact}
                onChange={handleChange}
                required
              />
            </div>

            <div className="contact-form-group">
              <label htmlFor="contact-message">WHAT'S ON YOUR MIND?</label>
              <textarea
                id="contact-message"
                name="message"
                rows="5"
                placeholder="Feedback, reservation query, or just saying hi..."
                value={formData.message}
                onChange={handleChange}
                required
              />
            </div>

            <motion.button
              type="submit"
              className="contact-submit-button"
              whileHover={{
                scale: 1.02
              }}
              whileTap={{
                scale: 0.98
              }}
            >
              SEND MESSAGE 🚀
            </motion.button>
          </form>
        </div>
      </motion.section>

      <motion.div
        className="contact-see-you-banner"
        initial={{
          opacity: 0,
          y: 20
        }}
        whileInView={{
          opacity: 1,
          y: 0
        }}
        viewport={{
          once: true
        }}
      >
        <h2>SEE YOU AT Y.A.A.R.A.N.A! ♡</h2>
        <p>Bring your friends and make great memories with us today.</p>
      </motion.div>
    </div>
  );
}

export default Contact;
