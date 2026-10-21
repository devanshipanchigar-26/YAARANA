import React from 'react';
import { Mail, Phone } from 'lucide-react';
import './SocialIcons.css';

// Clean, recognizable Instagram SVG Icon
export function InstagramIcon({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

// Clean, recognizable Facebook SVG Icon
export function FacebookIcon({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

export default function SocialIcons({
  settings = {},
  size = 20,
  className = '',
  includeContact = true,
}) {
  const instagramUrl = settings.instagramUrl?.trim() || '';
  const facebookUrl = settings.facebookUrl?.trim() || '';
  const rawPhone = settings.contactNumber?.trim() || '+91 98765 43210';
  const cleanPhone = rawPhone.replace(/[^0-9+]/g, '') || '+919876543210';
  const contactEmail = settings.notificationEmail?.trim() || 'admin@yaarana.com';

  return (
    <div className={`social-links-bar ${className}`}>
      {/* Instagram */}
      {instagramUrl && (
        <a
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="social-link-btn instagram"
          aria-label="Follow YAARANA Cafe on Instagram"
          title="Follow YAARANA on Instagram"
        >
          <InstagramIcon size={size} />
        </a>
      )}

      {/* Facebook */}
      {facebookUrl && (
        <a
          href={facebookUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="social-link-btn facebook"
          aria-label="Like YAARANA Cafe on Facebook"
          title="Connect on Facebook"
        >
          <FacebookIcon size={size} />
        </a>
      )}

      {/* Contact / Phone link — directly opens phone dialer app with typed number */}
      {includeContact && (
        <a
          href={`tel:${cleanPhone}`}
          className="social-link-btn phone"
          aria-label={`Call YAARANA Cafe at ${rawPhone}`}
          title={`Call us: ${rawPhone}`}
        >
          <Phone size={size} />
        </a>
      )}

      {/* Email link */}
      {includeContact && contactEmail && (
        <a
          href={`mailto:${contactEmail}`}
          className="social-link-btn email"
          aria-label={`Email YAARANA Cafe at ${contactEmail}`}
          title={`Email us: ${contactEmail}`}
        >
          <Mail size={size} />
        </a>
      )}
    </div>
  );
}
