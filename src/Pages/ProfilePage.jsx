import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  Shield,
  Lock,
  Eye,
  EyeOff,
  Save,
  CheckCircle2,
  AlertCircle,
  Calendar,
  ShoppingBag,
  LogOut,
  ArrowLeft,
  UtensilsCrossed,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import './ProfilePage.css';

export default function ProfilePage({ onBackHome, onNavigateToOrders, onNavigateToBookings }) {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, signOut, refreshProfile } = useAuth();

  // Personal details state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [profileErrorMsg, setProfileErrorMsg] = useState('');

  // Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('');
  const [passwordErrorMsg, setPasswordErrorMsg] = useState('');

  // Logout state
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Sync state whenever profile or user loads
  useEffect(() => {
    if (profile) {
      setName(profile.name || user?.user_metadata?.name || '');
      setPhone(profile.phone || user?.user_metadata?.phone || '');
    } else if (user) {
      setName(user.user_metadata?.name || user.user_metadata?.full_name || '');
      setPhone(user.user_metadata?.phone || '');
    }
  }, [profile, user]);

  // Handle Save Profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileSuccessMsg('');
    setProfileErrorMsg('');

    const cleanName = name.trim();
    const cleanPhone = phone.trim();

    if (!cleanName) {
      setProfileErrorMsg('Please enter your full name.');
      return;
    }

    if (cleanPhone && !/^[0-9]{10}$/.test(cleanPhone)) {
      setProfileErrorMsg('Please enter a valid 10-digit phone number.');
      return;
    }

    setProfileSaving(true);

    try {
      // 1. Update Supabase Auth user metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          name: cleanName,
          phone: cleanPhone,
        },
      });

      if (authError) throw authError;

      // 2. Update public.users table (ignoring role to maintain security)
      if (user?.id) {
        try {
          const { error: dbError } = await supabase
            .from('users')
            .update({
              name: cleanName,
              phone: cleanPhone,
            })
            .eq('id', user.id);

          if (dbError) {
            console.warn('public.users update note:', dbError.message);
          }
        } catch (dbErr) {
          console.warn('public.users update exception:', dbErr);
        }
      }

      // 3. Refresh profile in context
      if (refreshProfile) {
        await refreshProfile();
      }

      setProfileSuccessMsg('Profile details updated successfully!');
      setTimeout(() => setProfileSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error saving profile:', err);
      setProfileErrorMsg(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setProfileSaving(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordSuccessMsg('');
    setPasswordErrorMsg('');

    if (newPassword.length < 6) {
      setPasswordErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordErrorMsg('Passwords do not match. Please recheck.');
      return;
    }

    setPasswordUpdating(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setPasswordSuccessMsg('Password updated successfully! Please use it on your next login.');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccessMsg(''), 5000);
    } catch (err) {
      console.error('Error updating password:', err);
      setPasswordErrorMsg(err.message || 'Failed to change password. Please try again.');
    } finally {
      setPasswordUpdating(false);
    }
  };

  // Handle Sign Out
  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      navigate('/');
    } catch (err) {
      console.error('Sign out error:', err);
      setIsLoggingOut(false);
    }
  };

  const handleBack = () => {
    if (onBackHome) {
      onBackHome();
    } else {
      navigate('/');
    }
  };

  const goToOrders = () => {
    if (onNavigateToOrders) {
      onNavigateToOrders();
    } else {
      navigate('/my-orders');
    }
  };

  const goToBookings = () => {
    if (onNavigateToBookings) {
      onNavigateToBookings();
    } else {
      navigate('/my-bookings');
    }
  };

  // Format member joined date
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-IN', {
        month: 'short',
        year: 'numeric',
      })
    : 'Member';

  const userRole = profile?.role === 'admin' || user?.user_metadata?.role === 'admin' ? 'Admin' : 'Customer';

  // Compute initials
  const initials = (name || profile?.name || user?.email || 'U')
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (authLoading) {
    return (
      <div className="profile-page-root">
        <div className="profile-container profile-loading-state">
          <div className="profile-spinner"></div>
          <p>Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-page-root">
        <header className="my-orders-header">
          <div className="header-inner">
            <button
              type="button"
              className="btn-header-back"
              onClick={handleBack}
            >
              <ArrowLeft size={18} /> Menu
            </button>
            <div className="header-brand">
              <span className="brand-title">YAARANA</span>
              <span className="brand-sub">
                <span className="pulse-dot" /> My Profile & Account
              </span>
            </div>
            <div style={{ width: 36 }} />
          </div>
        </header>

        <div className="profile-container">
          <div className="profile-login-card">
            <div className="profile-login-icon">
              <User size={36} />
            </div>
            <h2>Account Login Required</h2>
            <p>
              Please log in to your YAARANA account to view your profile details, update contact information, or manage security settings.
            </p>
            <button
              className="profile-primary-btn"
              onClick={() => navigate('/login', { state: { returnUrl: '/profile' } })}
            >
              Log In to YAARANA
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page-root">
      {/* Top Header matching My Orders & My Bookings */}
      <header className="my-orders-header">
        <div className="header-inner">
          <button
            type="button"
            className="btn-header-back"
            onClick={handleBack}
          >
            <ArrowLeft size={18} /> Menu
          </button>
          <div className="header-brand">
            <span className="brand-title">YAARANA</span>
            <span className="brand-sub">
              <span className="pulse-dot" /> My Profile & Account
            </span>
          </div>
          <div style={{ width: 36 }} />
        </div>
      </header>

      <main className="profile-container">
        {/* Account Overview Hero Card */}
        <section className="profile-hero-card">
          <div className="profile-avatar-wrapper">
            <div className="profile-avatar-circle">{initials}</div>
            <span className="profile-role-badge">
              <Shield size={12} />
              {userRole}
            </span>
          </div>

          <div className="profile-hero-info">
            <div className="profile-hero-title-row">
              <h2 className="profile-hero-name">{name || 'Valued Guest'}</h2>
              <button
                type="button"
                className="profile-hero-logout-btn"
                onClick={handleSignOut}
                disabled={isLoggingOut}
                title="Log out of your account"
              >
                <LogOut size={16} />
                <span>{isLoggingOut ? 'Signing out...' : 'Log Out'}</span>
              </button>
            </div>
            <p className="profile-hero-email">
              <Mail size={15} />
              <span>{user.email}</span>
            </p>
            <div className="profile-hero-meta">
              <span className="profile-meta-item">
                <Calendar size={14} />
                Joined {memberSince}
              </span>
              <span className="profile-meta-item">
                <Sparkles size={14} />
                YAARANA Rewards Active
              </span>
            </div>
          </div>
        </section>

        {/* Quick Nav Shortcuts */}
        <section className="profile-shortcuts-grid">
          {(profile?.role === 'admin' || user?.user_metadata?.role === 'admin') && (
            <button
              className="profile-shortcut-card admin-shortcut-card"
              onClick={() => navigate('/', { state: { openAdmin: true } })}
            >
              <div className="shortcut-icon-box admin-bg">
                <Shield size={22} />
              </div>
              <div className="shortcut-text">
                <span className="shortcut-title">Admin Dashboard</span>
                <span className="shortcut-desc">Manage orders, bookings, menu & stats</span>
              </div>
            </button>
          )}

          <button className="profile-shortcut-card" onClick={goToOrders}>
            <div className="shortcut-icon-box orders-bg">
              <ShoppingBag size={22} />
            </div>
            <div className="shortcut-text">
              <span className="shortcut-title">My Orders</span>
              <span className="shortcut-desc">Track live food preparation & order history</span>
            </div>
          </button>

          <button className="profile-shortcut-card" onClick={goToBookings}>
            <div className="shortcut-icon-box bookings-bg">
              <UtensilsCrossed size={22} />
            </div>
            <div className="shortcut-text">
              <span className="shortcut-title">My Table Bookings</span>
              <span className="shortcut-desc">Check upcoming reservations & booking status</span>
            </div>
          </button>
        </section>

        {/* Two-Column Forms: Personal Details & Password */}
        <div className="profile-forms-grid">
          {/* Card 1: Personal Details */}
          <section className="profile-card">
            <div className="profile-card-header">
              <div className="profile-card-title-wrap">
                <div className="profile-icon-pill">
                  <User size={18} />
                </div>
                <div>
                  <h3>Personal Information</h3>
                  <p>Update your display name and contact phone number</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="profile-form">
              {profileSuccessMsg && (
                <div className="profile-alert success">
                  <CheckCircle2 size={18} />
                  <span>{profileSuccessMsg}</span>
                </div>
              )}

              {profileErrorMsg && (
                <div className="profile-alert error">
                  <AlertCircle size={18} />
                  <span>{profileErrorMsg}</span>
                </div>
              )}

              <div className="profile-form-group">
                <label htmlFor="profile-name">
                  Full Name <span className="req">*</span>
                </label>
                <div className="profile-input-wrap">
                  <User size={16} className="profile-input-icon" />
                  <input
                    id="profile-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              </div>

              <div className="profile-form-group">
                <label htmlFor="profile-phone">
                  Phone Number
                </label>
                <div className="profile-input-wrap">
                  <Phone size={16} className="profile-input-icon" />
                  <input
                    id="profile-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit mobile number"
                  />
                </div>
                <small className="profile-field-hint">Used for order tracking SMS & table booking confirmations</small>
              </div>

              <div className="profile-form-group">
                <label htmlFor="profile-email">
                  Email Address <span className="locked-tag">(Read-only)</span>
                </label>
                <div className="profile-input-wrap is-disabled">
                  <Mail size={16} className="profile-input-icon" />
                  <input
                    id="profile-email"
                    type="email"
                    value={user.email || ''}
                    disabled
                    readOnly
                  />
                </div>
              </div>

              <div className="profile-form-group">
                <label>
                  Account Role <span className="locked-tag">(Read-only)</span>
                </label>
                <div className="profile-input-wrap is-disabled">
                  <Shield size={16} className="profile-input-icon" />
                  <input
                    type="text"
                    value={userRole}
                    disabled
                    readOnly
                  />
                </div>
              </div>

              <button
                type="submit"
                className="profile-save-btn"
                disabled={profileSaving}
              >
                {profileSaving ? (
                  <>
                    <span className="profile-btn-spinner"></span>
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Save Profile</span>
                  </>
                )}
              </button>
            </form>
          </section>

          {/* Card 2: Security & Password */}
          <section className="profile-card">
            <div className="profile-card-header">
              <div className="profile-card-title-wrap">
                <div className="profile-icon-pill">
                  <Lock size={18} />
                </div>
                <div>
                  <h3>Security & Password</h3>
                  <p>Keep your YAARANA account safe with a strong password</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="profile-form">
              {passwordSuccessMsg && (
                <div className="profile-alert success">
                  <CheckCircle2 size={18} />
                  <span>{passwordSuccessMsg}</span>
                </div>
              )}

              {passwordErrorMsg && (
                <div className="profile-alert error">
                  <AlertCircle size={18} />
                  <span>{passwordErrorMsg}</span>
                </div>
              )}

              <div className="profile-form-group">
                <label htmlFor="profile-new-password">New Password</label>
                <div className="profile-input-wrap">
                  <Lock size={16} className="profile-input-icon" />
                  <input
                    id="profile-new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter at least 6 characters"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    tabIndex="-1"
                    title={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="profile-form-group">
                <label htmlFor="profile-confirm-password">Confirm New Password</label>
                <div className="profile-input-wrap">
                  <Lock size={16} className="profile-input-icon" />
                  <input
                    id="profile-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex="-1"
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="profile-save-btn secondary"
                disabled={passwordUpdating || !newPassword || !confirmPassword}
              >
                {passwordUpdating ? (
                  <>
                    <span className="profile-btn-spinner"></span>
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    <span>Update Password</span>
                  </>
                )}
              </button>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
