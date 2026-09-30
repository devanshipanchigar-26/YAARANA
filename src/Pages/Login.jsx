import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import AuthCard from '../Components/AuthCard';
import AuthInput from '../Components/AuthInput';
import AuthButton from '../Components/AuthButton';

function Login() {
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="logo">
          Y.A.A.R.A.N.A {/*Logo nu image add kar vanu che */}
        </div>

        <h1>WELCOME BACK!</h1>

        <p className="subtitle">Let's make today a little more delicious!</p>

        <form>
          <div className="input-group">
            <label>Username:</label>
            <input type="text" placeholder="Enter your username" />
          </div>

          <div className="input-group">
            <label>Password:</label>
            <input type="password" placeholder="Enter your password" />
          </div>

          <div className="options">
            <label>
              <input type="checkbox" />
              Remember Me
            </label>

            <Link to="/forgot-password">Forgot Password?</Link>
          </div>

          <button type="submit">LOGIN</button>
        </form>

        <p className="bottom-text">
          Don't have an account? <Link to="/signup">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
