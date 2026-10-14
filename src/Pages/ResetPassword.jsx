import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import '../Components/ForgotPassword.css';

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setHasValidSession(true);
      }
      setCheckingSession(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setHasValidSession(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-page">
      <div className="forgot-card">
        <div className="logo">Y.A.A.R.A.N.A</div>

        <h1>RESET PASSWORD</h1>

        <p className="subtitle">Enter your new password below to secure your account.</p>

        {error && (
          <div style={{ background: '#FEE2E2', color: '#B91C1C', padding: '10px 14px', borderRadius: '12px', marginBottom: '16px', fontSize: '13px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {checkingSession ? (
          <p className="subtitle" style={{ textAlign: 'center', padding: '20px 0' }}>
            Verifying password reset request...
          </p>
        ) : !hasValidSession && !success ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ background: '#FEE2E2', color: '#B91C1C', padding: '14px', borderRadius: '12px', marginBottom: '20px', fontSize: '13px', lineHeight: '1.5' }}>
              Invalid or expired password reset link. Please request a new link from the forgot password page.
            </div>
            <Link to="/forgot-password" style={{ color: '#0086FF', fontWeight: 'bold', textDecoration: 'none' }}>
              ← Request New Link
            </Link>
          </div>
        ) : success ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ background: '#DCFCE7', color: '#15803D', padding: '14px', borderRadius: '12px', marginBottom: '20px', fontSize: '14px' }}>
              ✓ Your password has been successfully updated!
            </div>
            <button
              type="button"
              onClick={() => navigate('/login')}
              style={{
                width: '100%',
                height: '50px',
                borderRadius: '16px',
                backgroundColor: '#0086FF',
                color: 'white',
                fontFamily: "'Luckiest Guy', cursive",
                fontSize: '16px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              GO TO LOGIN
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>New Password</label>
              <input
                type="password"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" disabled={loading}>
              {loading ? 'UPDATING PASSWORD...' : 'UPDATE PASSWORD'}
            </button>
          </form>
        )}

        <p className="bottom-text">
          Remembered your password? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}

export default ResetPassword;
