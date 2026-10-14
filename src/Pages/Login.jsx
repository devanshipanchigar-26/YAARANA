import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import '../Components/Login.css';

function Login({ onLoginSuccess }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [loginType, setLoginType] = useState(() => (location.state?.adminMode ? 'admin' : 'user'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const returnToCheckout = location.state?.returnToCheckout;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError('');

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      if (loginType === 'admin') {
        // Authoritative server-backed check: verify role directly from public.users table
        const { data: profileData } = await supabase
          .from('users')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle();

        const role = profileData?.role || data.user.user_metadata?.role;

        if (role !== 'admin') {
          // Immediately sign out to prevent unauthorized admin access
          await supabase.auth.signOut();
          setError('Access Denied: This account does not have administrator privileges. Please use User Login.');
          setLoading(false);
          return;
        }

        if (onLoginSuccess) {
          onLoginSuccess(data);
        }

        navigate('/', { state: { openAdmin: true }, replace: true });
        return;
      }

      // Regular User Login flow
      if (onLoginSuccess) {
        onLoginSuccess(data);
      }

      if (returnToCheckout) {
        navigate('/', { state: { resumeCheckout: true }, replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="logo">
          Y.A.A.R.A.N.A
        </div>

        {/* User / Admin Login Type Switcher */}
        <div className="login-type-switch">
          <button
            type="button"
            className={`login-type-btn ${loginType === 'user' ? 'active' : ''}`}
            onClick={() => {
              setLoginType('user');
              setError('');
            }}
          >
            👤 User Login
          </button>
          <button
            type="button"
            className={`login-type-btn ${loginType === 'admin' ? 'active' : ''}`}
            onClick={() => {
              setLoginType('admin');
              setError('');
            }}
          >
            🛡️ Admin Login
          </button>
        </div>

        <h1>{loginType === 'admin' ? 'ADMIN PORTAL' : 'WELCOME BACK!'}</h1>

        <p className="subtitle">
          {loginType === 'admin'
            ? 'Sign in to access restaurant management and operations.'
            : returnToCheckout
            ? 'Please log in to continue with your checkout.'
            : "Let's make today a little more delicious!"}
        </p>

        {error && (
          <div style={{ background: '#FEE2E2', color: '#B91C1C', padding: '10px 14px', borderRadius: '12px', marginBottom: '16px', fontSize: '13px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Email Address:</label>
            <input
              type="email"
              placeholder={loginType === 'admin' ? 'admin@yaarana.com' : 'Enter your email'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label>Password:</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="options">
            <label>
              <input type="checkbox" />
              Remember Me
            </label>

            <Link to="/forgot-password">Forgot Password?</Link>
          </div>

          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading
              ? loginType === 'admin' ? 'VERIFYING ADMIN...' : 'LOGGING IN...'
              : loginType === 'admin' ? 'LOGIN AS ADMIN' : 'LOGIN'}
          </button>
        </form>

        {loginType === 'admin' ? (
          <p className="bottom-text">
            Need admin access? Contact the cafe administrator.
          </p>
        ) : (
          <p className="bottom-text">
            Don't have an account?{' '}
            <Link to="/signup" state={location.state}>
              Sign Up
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

export default Login;
