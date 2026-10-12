import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import '../Components/ForgotPassword.css';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        setError(resetError.message);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-page">
      <div className="forgot-card">
        <div className="logo">Y.A.A.R.A.N.A</div>

        <h1>FORGOT PASSWORD?</h1>

        <p className="subtitle">
          No worries! Enter your email and we'll send you a password reset link.
        </p>

        {error && (
          <div style={{ background: '#FEE2E2', color: '#B91C1C', padding: '10px 14px', borderRadius: '12px', marginBottom: '16px', fontSize: '13px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {success ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ background: '#DCFCE7', color: '#15803D', padding: '14px', borderRadius: '12px', marginBottom: '20px', fontSize: '14px' }}>
              ✓ Password reset link sent! Check your inbox to set a new password.
            </div>
            <Link to="/login" style={{ color: '#0086FF', fontWeight: 'bold', textDecoration: 'none' }}>
              ← Return to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button type="submit" disabled={loading}>
              {loading ? 'SENDING LINK...' : 'SEND RESET LINK'}
            </button>
          </form>
        )}

        <p className="bottom-text">
          Remember your password?
          <Link to="/login"> Login</Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPassword;