import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import '../Components/Signup.css';

function Signup() {
  const navigate = useNavigate();
  const location = useLocation();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: name.trim(),
            phone: phone.trim(),
          },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      // Best effort sync with public.users table
      if (data?.user?.id) {
        try {
          await supabase.from('users').upsert({
            id: data.user.id,
            name: name.trim(),
            phone: phone.trim(),
            email: email.trim(),
            role: 'customer',
          });
        } catch {
          // If RLS blocks unconfirmed user, server trigger will populate it
        }
      }

      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-card">
        <div className="logo">Y.A.A.R.A.N.A</div>

        <h1>JOIN THE FAMILY!</h1>

        <p className="subtitle">
          Create your account and start your Yaarana journey.
        </p>

        {error && (
          <div style={{ background: '#FEE2E2', color: '#B91C1C', padding: '10px 14px', borderRadius: '12px', marginBottom: '16px', fontSize: '13px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {success ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ background: '#DCFCE7', color: '#15803D', padding: '16px', borderRadius: '16px', marginBottom: '20px', fontSize: '14px', lineHeight: '1.5' }}>
              🎉 <strong>Almost there!</strong><br />
              We sent a verification link to <strong>{email}</strong>.<br />
              Please check your inbox and click the link to verify your account.
            </div>
            <button
              type="button"
              onClick={() => navigate('/login', { state: location.state })}
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
              <label>Full Name</label>
              <input
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label>Phone Number</label>
              <input
                type="tel"
                placeholder="Enter your phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                pattern="[0-9+ ]{10,15}"
                title="Please enter a valid phone number"
                required
              />
            </div>

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

            <div className="input-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="Enter your password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label>Confirm Password</label>
              <input
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" disabled={loading}>
              {loading ? 'CREATING ACCOUNT...' : 'SIGN UP'}
            </button>
          </form>
        )}

        <p className="bottom-text">
          Already have an account?{' '}
          <Link to="/login" state={location.state}>
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;