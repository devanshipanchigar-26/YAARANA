import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import AuthCard from '../Components/AuthCard';
import AuthInput from '../Components/AuthInput';
import AuthButton from '../Components/AuthButton';

function Signup() {
  return (
    <div className="signup-page">
      <div className="signup-card">
        <div className="logo">Y.A.A.R.A.N.A</div>

        <h1>JOIN THE FAMILY!</h1>

        <p className="subtitle">
          Create your account and start your Yaarana journey.
        </p>

        <form>
          <div className="input-group">
            <label>Username</label>
            <input type="text" placeholder="Enter your username" />
          </div>

          <div className="input-group">
            <label>Username</label>
            <input type="text" placeholder="Enter your username" />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input type="password" placeholder="Enter your password" />
          </div>

          <div className="input-group">
            <label>Confirm Password</label>
            <input type="password" placeholder="Confirm your password" />
          </div>

          <button type="submit">SIGN UP</button>
        </form>

        <p className="bottom-text">
          Already have an account? <Link to="/">Login</Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;