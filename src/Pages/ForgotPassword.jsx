import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import AuthCard from '../Components/AuthCard';
import AuthInput from '../Components/AuthInput';
import AuthButton from '../Components/AuthButton';

function ForgotPassword() {
    return (
        <div className="forgot-page">
            <div className="forgot-card">
                <div className="logo">Y.A.A.R.A.N.A</div>

                <h1>FORGOT PASSWORD?</h1>

                <p className="subtitle">No worries! Enter your email and we'll send you a password reset link.</p>

                <form>
                    <div className="input-group">
                        <label>Email Address</label>

                        <input type="email" placeholder="Enter your email" />
                    </div>

                    <button type="submit">SEND RESET LINK</button>
                </form>

                <p className="bottom-text">
                    Remember your password?
                    <Link to="/"> Login</Link>
                </p>
            </div>
        </div>
    );
}

export default ForgotPassword;