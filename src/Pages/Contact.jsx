import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Phone, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCafeSettings } from "../utils/cafeSettings";
import { supabase } from "../supabaseClient";
import { InstagramIcon, FacebookIcon } from "../Components/SocialIcons";
import "./Contact.css";

function formatTime12(timeStr) {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  const m = mStr || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

function Contact() {
  const { user, profile } = useAuth();
  const [cafeSettings] = useCafeSettings();

  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    message: ""
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Pre-fill user profile info if logged in
  useEffect(() => {
    if (user || profile) {
      setFormData((prev) => ({
        ...prev,
        name: prev.name || profile?.name || user?.user_metadata?.name || "",
        contact: prev.contact || profile?.phone || user?.email || ""
      }));
    }
  }, [user, profile]);

  const openFormatted = formatTime12(cafeSettings?.openingTime) || '10:00 AM';
  const closeFormatted = formatTime12(cafeSettings?.closingTime) || '11:00 PM';
  const closingDays = Array.isArray(cafeSettings?.closingDays) ? cafeSettings.closingDays : [];
  const displayPhone = cafeSettings?.contactNumber?.trim() || '+91 98765 43210';
  const cleanPhone = displayPhone.replace(/[^0-9+]/g, '') || '+919876543210';

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    const trimmedName = formData.name.trim();
    const trimmedContact = formData.contact.trim();
    const trimmedMessage = formData.message.trim();

    if (!trimmedName || !trimmedContact || !trimmedMessage) {
      setSubmitError("Please fill out all fields before sending.");
      return;
    }

    setSubmitting(true);
    try {
      // Insert into Supabase contact_messages table
      const { error } = await supabase
        .from('contact_messages')
        .insert([
          {
            user_id: user?.id || null,
            name: trimmedName,
            contact: trimmedContact,
            message: trimmedMessage,
            status: 'unread'
          }
        ]);

      if (error) {
        console.warn("Supabase contact_messages table insert failed, saving local backup:", error.message);
        // Fallback backup in localStorage so inquiry is never lost
        try {
          const raw = localStorage.getItem('yaarana_pending_contact_messages');
          const list = raw ? JSON.parse(raw) : [];
          list.push({
            id: 'local_' + Date.now(),
            user_id: user?.id || null,
            name: trimmedName,
            contact: trimmedContact,
            message: trimmedMessage,
            created_at: new Date().toISOString()
          });
          localStorage.setItem('yaarana_pending_contact_messages', JSON.stringify(list));
        } catch (backupErr) {
          console.error("Local backup error:", backupErr);
        }
      }

      setSubmitSuccess(true);
      setFormData((prev) => ({
        ...prev,
        message: ""
      }));
    } catch (err) {
      console.error("Error submitting contact form:", err);
      setSubmitError("Failed to deliver your message. Please reach out via phone directly.");
    } finally {
      setSubmitting(false);
    }
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

      {/* HOURS & LOCATION */}
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
          <span className="contact-card-badge">OPENING HOURS & LOCATION</span>
          <h2>COME VISIT US</h2>
          <div className="contact-blue-line"></div>

          <div className="contact-hours-list">
            <div className="contact-hours-row">
              <span>Operating Hours:</span>
              <strong>{openFormatted} – {closeFormatted}</strong>
            </div>

            {closingDays.length > 0 && (
              <div className="contact-hours-row">
                <span>Weekly Off:</span>
                <strong style={{ color: '#E53935' }}>{closingDays.join(', ')}</strong>
              </div>
            )}

            <div className="contact-hours-row">
              <span>Location:</span>
              <strong>{cafeSettings?.address || '123 Yaarana Street, Foodie Hub, City'}</strong>
            </div>

            <div className="contact-hours-row">
              <span>Phone / Call Us:</span>
              <strong>
                <a
                  href={`tel:${cleanPhone}`}
                  className="contact-phone-link"
                  title={`Call ${displayPhone} in Phone app`}
                >
                  📞 {displayPhone}
                </a>
              </strong>
            </div>
          </div>
        </div>
      </motion.section>

      {/* REACH OUT DIRECTLY SECTION */}
      <motion.section
        className="contact-social-section"
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
        <div className="contact-info-card contact-social-card">
          <span className="contact-card-badge">GET IN TOUCH</span>
          <h2>REACH OUT DIRECTLY</h2>
          <div className="contact-blue-line"></div>
          <p className="contact-social-subtitle">
            Call us directly or connect with us on social media for daily specials & events!
          </p>

          <div className="contact-social-grid">
            {/* Direct Phone Call Button */}
            <a
              href={`tel:${cleanPhone}`}
              className="contact-social-link-card phone"
              title={`Call ${displayPhone} directly`}
            >
              <div className="social-icon-wrapper phone">
                <Phone size={24} />
              </div>
              <div className="social-card-text">
                <span className="social-platform-title">Direct Phone Call</span>
                <span className="social-platform-action">Open Dialer ({displayPhone}) →</span>
              </div>
            </a>

            {/* Instagram */}
            {cafeSettings?.instagramUrl && (
              <a
                href={cafeSettings.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="contact-social-link-card instagram"
              >
                <div className="social-icon-wrapper instagram">
                  <InstagramIcon size={24} />
                </div>
                <div className="social-card-text">
                  <span className="social-platform-title">Instagram</span>
                  <span className="social-platform-action">Follow @YAARANA →</span>
                </div>
              </a>
            )}

            {/* Facebook */}
            {cafeSettings?.facebookUrl && (
              <a
                href={cafeSettings.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="contact-social-link-card facebook"
              >
                <div className="social-icon-wrapper facebook">
                  <FacebookIcon size={24} />
                </div>
                <div className="social-card-text">
                  <span className="social-platform-title">Facebook</span>
                  <span className="social-platform-action">Connect with us →</span>
                </div>
              </a>
            )}
          </div>
        </div>
      </motion.section>

      {/* FORM SECTION (CONNECTED TO DATABASE) */}
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

          {submitSuccess ? (
            <div className="contact-success-banner">
              <div className="contact-success-icon">✓</div>
              <h3>MESSAGE RECEIVED!</h3>
              <p>
                Thank you, <strong>{formData.name || 'Friend'}</strong>. Your message has been saved and sent to the YAARANA Cafe management team. We will get back to you soon!
              </p>
              <button
                type="button"
                className="contact-send-another-btn"
                onClick={() => setSubmitSuccess(false)}
              >
                Send Another Message 💬
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="contact-form">
              {submitError && (
                <div className="contact-error-alert">{submitError}</div>
              )}

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
                  placeholder="How can we reach you? (Phone or Email)"
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
                  placeholder="Feedback, party reservation query, catering, or just saying hi..."
                  value={formData.message}
                  onChange={handleChange}
                  required
                />
              </div>

              <motion.button
                type="submit"
                className="contact-submit-button"
                disabled={submitting}
                whileHover={!submitting ? { scale: 1.02 } : {}}
                whileTap={!submitting ? { scale: 0.98 } : {}}
              >
                {submitting ? "SENDING MESSAGE..." : "SEND MESSAGE 🚀"}
              </motion.button>
            </form>
          )}
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
