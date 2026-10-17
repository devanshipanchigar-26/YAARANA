import React, { useState, useEffect } from 'react';
import {
  Store,
  Clock,
  MapPin,
  Phone,
  DollarSign,
  ShoppingBag,
  Timer,
  CreditCard,
  Bell,
  Shield,
  Lock,
  LogOut,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ToggleLeft,
  ToggleRight,
  Info
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useCafeSettings, DEFAULT_SETTINGS, checkStoreOpenStatus, playOrderChimeSound } from '../utils/cafeSettings';
import './SettingsPage.css';

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export default function SettingsPage() {
  const { user, profile, signOut } = useAuth();
  const [settings, saveSettings] = useCafeSettings();

  // Local form state
  const [formData, setFormData] = useState({ ...DEFAULT_SETTINGS });
  const [activeSubTab, setActiveSubTab] = useState('all');

  // Compute live store status based on schedule and manual toggle
  const currentStoreStatus = checkStoreOpenStatus(formData);

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

  // Page feedback state
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);


  // Sync settings when loaded
  useEffect(() => {
    if (settings) {
      setFormData({ ...settings });
    }
  }, [settings]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleDayToggle = (day) => {
    setFormData((prev) => {
      const currentDays = prev.weeklyClosingDays || [];
      const updated = currentDays.includes(day)
        ? currentDays.filter((d) => d !== day)
        : [...currentDays, day];
      return { ...prev, weeklyClosingDays: updated };
    });
  };


  const validateForm = () => {
    if (!formData.cafeName?.trim()) {
      showToast('Cafe name cannot be empty', 'error');
      return false;
    }
    if (Number(formData.minOrderAmount) < 0) {
      showToast('Minimum order amount cannot be negative', 'error');
      return false;
    }
    return true;
  };

  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    try {
      await saveSettings(formData);
      showToast('Settings successfully updated and applied!');
    } catch (err) {
      console.error('Error saving settings:', err);
      showToast('Failed to save settings. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetSettings = () => {
    if (window.confirm('Reset all changes back to currently saved values?')) {
      setFormData({ ...settings });
      showToast('Changes discarded.', 'info');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMessage({ type: '', text: '' });

    if (!newPassword) {
      setPasswordMessage({ type: 'error', text: 'Please enter a new password.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage({
        type: 'error',
        text: 'Password must be at least 6 characters long.',
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setPasswordMessage({
        type: 'success',
        text: 'Password successfully updated! Use your new password on your next login.',
      });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Error updating password:', err.message);
      setPasswordMessage({
        type: 'error',
        text: err.message || 'Failed to update password.',
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const isTabVisible = (tabKey) => activeSubTab === 'all' || activeSubTab === tabKey;

  return (
    <div className="settings-page">
      {/* Toast Alert */}
      {toast && (
        <div className={`settings-toast ${toast.type}`}>
          {toast.type === 'success' ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertCircle size={18} />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="settings-header">
        <div>
          <h1 className="settings-title">SETTINGS</h1>
          <p className="settings-subtitle">
            Configure cafe profile, ordering rules, payments, notifications & admin security
          </p>
        </div>

        <div className="settings-top-actions">
          <button
            type="button"
            className="btn-settings-reset"
            onClick={handleResetSettings}
            disabled={saving}
          >
            <RotateCcw size={16} /> Discard Changes
          </button>
          <button
            type="button"
            className="btn-settings-save"
            onClick={handleSaveSettings}
            disabled={saving}
          >
            <Save size={16} /> {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="settings-filter-bar">
        {[
          { key: 'all', label: 'All Settings' },
          { key: 'profile', label: 'Cafe Profile' },
          { key: 'orders', label: 'Order & Takeaway' },
          { key: 'payments', label: 'Payments' },
          { key: 'notifications', label: 'Notifications' },
          { key: 'security', label: 'Account & Security' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`settings-tab-btn ${activeSubTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveSubTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="settings-grid">
        {/* SECTION 1: CAFE PROFILE */}
        {isTabVisible('profile') && (
          <section className="settings-card">
            <div className="settings-card-header">
              <div className="card-header-icon profile-icon">
                <Store size={22} />
              </div>
              <div>
                <h2>Cafe Profile</h2>
                <p>Visible to customers across the YAARANA website and footer</p>
              </div>
            </div>

            <div className="settings-card-body">
              <div className="form-row">
                <div className="form-group flex-2">
                  <label htmlFor="cafeName">Cafe Name</label>
                  <input
                    id="cafeName"
                    type="text"
                    value={formData.cafeName || ''}
                    onChange={(e) => handleInputChange('cafeName', e.target.value)}
                    placeholder="e.g. YAARANA Cafe"
                    required
                  />
                </div>

                <div className="form-group flex-1">
                  <label htmlFor="contactNumber">
                    <Phone size={14} style={{ display: 'inline', marginRight: 4 }} />
                    Contact Number
                  </label>
                  <input
                    id="contactNumber"
                    type="tel"
                    value={formData.contactNumber || ''}
                    onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="logoUrl">Cafe Logo URL / Image Link</label>
                <input
                  id="logoUrl"
                  type="url"
                  value={formData.logoUrl || ''}
                  onChange={(e) => handleInputChange('logoUrl', e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
                {formData.logoUrl && (
                  <div className="logo-preview-box">
                    <span>Preview:</span>
                    <img
                      src={formData.logoUrl}
                      alt="Logo preview"
                      className="logo-preview-img"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="address">
                  <MapPin size={14} style={{ display: 'inline', marginRight: 4 }} />
                  Full Address
                </label>
                <textarea
                  id="address"
                  rows={2}
                  value={formData.address || ''}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Street, Landmark, City, Pincode"
                />
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label htmlFor="openingTime">
                    <Clock size={14} style={{ display: 'inline', marginRight: 4 }} />
                    Opening Time
                  </label>
                  <input
                    id="openingTime"
                    type="time"
                    value={formData.openingTime || '10:00'}
                    onChange={(e) => handleInputChange('openingTime', e.target.value)}
                  />
                </div>

                <div className="form-group flex-1">
                  <label htmlFor="closingTime">
                    <Clock size={14} style={{ display: 'inline', marginRight: 4 }} />
                    Closing Time
                  </label>
                  <input
                    id="closingTime"
                    type="time"
                    value={formData.closingTime || '23:00'}
                    onChange={(e) => handleInputChange('closingTime', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Weekly Closing Days (Select if closed on any day)</label>
                <div className="day-pills-container">
                  {DAYS_OF_WEEK.map((day) => {
                    const isClosed = (formData.weeklyClosingDays || []).includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        className={`day-pill ${isClosed ? 'active' : ''}`}
                        onClick={() => handleDayToggle(day)}
                        aria-pressed={isClosed}
                      >
                        {day} {isClosed ? '✓' : ''}
                      </button>
                    );
                  })}
                </div>
                <small className="field-hint">
                  {(formData.weeklyClosingDays || []).length === 0
                    ? '🟢 Currently open all 7 days a week.'
                    : `🔴 Closed on: ${formData.weeklyClosingDays.join(', ')}`}
                </small>
              </div>
            </div>
          </section>
        )}

        {/* SECTION 2: ORDER & TAKEAWAY SETTINGS */}
        {isTabVisible('orders') && (
          <section className="settings-card">
            <div className="settings-card-header">
              <div className="card-header-icon orders-icon">
                <ShoppingBag size={22} />
              </div>
              <div>
                <h2>Order & Takeaway Settings</h2>
                <p>Manage dine-in & takeaway order intake, minimum cart thresholds, and prep timing</p>
              </div>
            </div>

            <div className="settings-card-body">
              {/* Accepting orders banner toggle with schedule awareness */}
              <div
                className={`order-status-banner ${
                  currentStoreStatus.isOpen ? 'status-open' : 'status-closed'
                }`}
              >
                <div className="status-info">
                  <span className="status-indicator-dot" />
                  <div>
                    <strong>
                      {currentStoreStatus.isOpen
                        ? 'Store is OPEN & Accepting Orders'
                        : currentStoreStatus.badge}
                    </strong>
                    <p>{currentStoreStatus.message}</p>
                  </div>
                </div>

                <button
                  type="button"
                  className={`toggle-switch-btn ${formData.acceptingOrders ? 'on' : 'off'}`}
                  onClick={() =>
                    handleInputChange('acceptingOrders', !formData.acceptingOrders)
                  }
                  aria-label="Toggle accepting orders"
                >
                  {formData.acceptingOrders ? (
                    <ToggleRight size={38} />
                  ) : (
                    <ToggleLeft size={38} />
                  )}
                </button>
              </div>

              {/* Automatic closing schedule toggle */}
              <div className="settings-toggle-row">
                <div className="toggle-info">
                  <strong>Auto-close when shop is closed</strong>
                  <p>
                    Automatically pause customer orders when outside operating hours ({formData.openingTime || '10:00'} – {formData.closingTime || '23:00'})
                    {formData.weeklyClosingDays?.length > 0
                      ? ` and on weekly off days (${formData.weeklyClosingDays.join(', ')}).`
                      : '.'}
                  </p>
                </div>
                <button
                  type="button"
                  className={`toggle-switch-btn ${
                    formData.autoCloseOutsideHours !== false ? 'on' : 'off'
                  }`}
                  onClick={() =>
                    handleInputChange(
                      'autoCloseOutsideHours',
                      formData.autoCloseOutsideHours === false ? true : false
                    )
                  }
                >
                  {formData.autoCloseOutsideHours !== false ? (
                    <ToggleRight size={34} />
                  ) : (
                    <ToggleLeft size={34} />
                  )}
                </button>
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label htmlFor="minOrderAmount">
                    <DollarSign size={14} style={{ display: 'inline', marginRight: 4 }} />
                    Minimum Order Amount (₹)
                  </label>
                  <input
                    id="minOrderAmount"
                    type="number"
                    min="0"
                    step="10"
                    value={formData.minOrderAmount ?? 0}
                    onChange={(e) =>
                      handleInputChange(
                        'minOrderAmount',
                        Math.max(0, Number(e.target.value))
                      )
                    }
                    placeholder="0"
                  />
                  <small className="field-hint">
                    Set to ₹0 for no minimum restriction (applies to dine-in & takeaway).
                  </small>
                </div>

                <div className="form-group flex-1">
                  <label htmlFor="estimatedPrepTime">
                    <Timer size={14} style={{ display: 'inline', marginRight: 4 }} />
                    Estimated Preparation Time
                  </label>
                  <input
                    id="estimatedPrepTime"
                    type="text"
                    value={formData.estimatedPrepTime || ''}
                    onChange={(e) =>
                      handleInputChange('estimatedPrepTime', e.target.value)
                    }
                    placeholder="e.g. 20-25 mins"
                  />
                  <div className="quick-presets">
                    <span>Presets:</span>
                    {['10-15 mins', '20-25 mins', '30-40 mins', '45+ mins'].map(
                      (preset) => (
                        <button
                          key={preset}
                          type="button"
                          className="preset-btn"
                          onClick={() => handleInputChange('estimatedPrepTime', preset)}
                        >
                          {preset}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* SECTION 3: PAYMENT SETTINGS */}
        {isTabVisible('payments') && (
          <section className="settings-card">
            <div className="settings-card-header">
              <div className="card-header-icon payments-icon">
                <CreditCard size={22} />
              </div>
              <div>
                <h2>Payment Settings</h2>
                <p>Enable or disable payment methods accepted at the cafe</p>
              </div>
            </div>

            <div className="settings-card-body">
              <div className="settings-toggle-row">
                <div className="toggle-info">
                  <strong>Cash at Counter / COD</strong>
                  <p>Allow customers to pay physically with cash upon pickup or dine-in</p>
                </div>
                <button
                  type="button"
                  className={`toggle-switch-btn ${
                    formData.cashPaymentEnabled ? 'on' : 'off'
                  }`}
                  onClick={() =>
                    handleInputChange(
                      'cashPaymentEnabled',
                      !formData.cashPaymentEnabled
                    )
                  }
                >
                  {formData.cashPaymentEnabled ? (
                    <ToggleRight size={34} />
                  ) : (
                    <ToggleLeft size={34} />
                  )}
                </button>
              </div>

              <div className="settings-toggle-row">
                <div className="toggle-info">
                  <strong>Pay Online (Razorpay Test Mode)</strong>
                  <p>Accept instant payments via Razorpay (UPI, Credit/Debit Cards, Netbanking)</p>
                </div>
                <button
                  type="button"
                  className={`toggle-switch-btn ${
                    formData.razorpayPaymentEnabled !== false ? 'on' : 'off'
                  }`}
                  onClick={() =>
                    handleInputChange(
                      'razorpayPaymentEnabled',
                      formData.razorpayPaymentEnabled === false
                    )
                  }
                >
                  {formData.razorpayPaymentEnabled !== false ? (
                    <ToggleRight size={34} />
                  ) : (
                    <ToggleLeft size={34} />
                  )}
                </button>
              </div>

              <div className="security-notice-box">
                <Info size={16} />
                <span>
                  <strong>Security Guarantee:</strong> Payment toggles only enable or disable options in the checkout interface. No payment secret keys or sensitive credentials are stored or exposed in client code.
                </span>
              </div>
            </div>
          </section>
        )}

        {/* SECTION 4: NOTIFICATIONS */}
        {isTabVisible('notifications') && (
          <section className="settings-card">
            <div className="settings-card-header">
              <div className="card-header-icon notifications-icon">
                <Bell size={22} />
              </div>
              <div>
                <h2>Notification Preferences</h2>
                <p>Configure sound alerts and operational notifications</p>
              </div>
            </div>

            <div className="settings-card-body">
              <div className="settings-toggle-row">
                <div className="toggle-info">
                  <strong>New Order Sound Alerts</strong>
                  <p>Play an audible alert in the Admin Panel when a customer places an order</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    type="button"
                    className="btn-test-chime"
                    onClick={() => {
                      playOrderChimeSound();
                      showToast('🔔 Counter Service Bell: Ding!');
                    }}
                    title="Test the counter bell ding sound"
                  >
                    🔔 Test Bell ("Ding!")
                  </button>
                  <button
                    type="button"
                    className={`toggle-switch-btn ${
                      formData.newOrderAlerts ? 'on' : 'off'
                    }`}
                    onClick={() =>
                      handleInputChange('newOrderAlerts', !formData.newOrderAlerts)
                    }
                  >
                    {formData.newOrderAlerts ? (
                      <ToggleRight size={34} />
                    ) : (
                      <ToggleLeft size={34} />
                    )}
                  </button>
                </div>
              </div>

              <div className="settings-toggle-row">
                <div className="toggle-info">
                  <strong>Order Status Notifications</strong>
                  <p>Keep track of live order progress updates (Preparing, Ready, Completed)</p>
                </div>
                <button
                  type="button"
                  className={`toggle-switch-btn ${
                    formData.orderStatusNotifications ? 'on' : 'off'
                  }`}
                  onClick={() =>
                    handleInputChange(
                      'orderStatusNotifications',
                      !formData.orderStatusNotifications
                    )
                  }
                >
                  {formData.orderStatusNotifications ? (
                    <ToggleRight size={34} />
                  ) : (
                    <ToggleLeft size={34} />
                  )}
                </button>
              </div>

              <div className="settings-toggle-row">
                <div className="toggle-info">
                  <strong>Low Stock Warnings</strong>
                  <p>Highlight menu items marked unavailable in Menu Management</p>
                </div>
                <button
                  type="button"
                  className={`toggle-switch-btn ${
                    formData.lowStockAlerts ? 'on' : 'off'
                  }`}
                  onClick={() =>
                    handleInputChange('lowStockAlerts', !formData.lowStockAlerts)
                  }
                >
                  {formData.lowStockAlerts ? (
                    <ToggleRight size={34} />
                  ) : (
                    <ToggleLeft size={34} />
                  )}
                </button>
              </div>

              <div className="settings-toggle-row">
                <div className="toggle-info">
                  <strong>Email Notifications</strong>
                  <p>Send daily summaries or urgent order notices to the admin email</p>
                </div>
                <button
                  type="button"
                  className={`toggle-switch-btn ${
                    formData.emailNotificationsEnabled ? 'on' : 'off'
                  }`}
                  onClick={() =>
                    handleInputChange(
                      'emailNotificationsEnabled',
                      !formData.emailNotificationsEnabled
                    )
                  }
                >
                  {formData.emailNotificationsEnabled ? (
                    <ToggleRight size={34} />
                  ) : (
                    <ToggleLeft size={34} />
                  )}
                </button>
              </div>

              {formData.emailNotificationsEnabled && (
                <div className="form-group" style={{ marginTop: 14 }}>
                  <label htmlFor="notificationEmail">Admin Notification Email</label>
                  <input
                    id="notificationEmail"
                    type="email"
                    value={formData.notificationEmail || ''}
                    onChange={(e) =>
                      handleInputChange('notificationEmail', e.target.value)
                    }
                    placeholder="admin@yaarana.com"
                  />
                  <small className="field-hint">
                    Note: Automated email sending requires a configured backend SMTP or Supabase Edge Function.
                  </small>
                </div>
              )}
            </div>
          </section>
        )}

        {/* SECTION 5: ACCOUNT & SECURITY */}
        {isTabVisible('security') && (
          <section className="settings-card security-card">
            <div className="settings-card-header">
              <div className="card-header-icon security-icon">
                <Shield size={22} />
              </div>
              <div>
                <h2>Account & Security</h2>
                <p>Manage your administrator credentials, active session & password</p>
              </div>
            </div>

            <div className="settings-card-body">
              {/* Profile details */}
              <div className="admin-profile-badge">
                <div className="admin-avatar-lg">
                  {(profile?.name || user?.email || 'A').charAt(0).toUpperCase()}
                </div>
                <div className="admin-badge-info">
                  <h3>{profile?.name || 'YAARANA Administrator'}</h3>
                  <p className="admin-email">{user?.email || 'No email associated'}</p>
                  <span className="admin-role-tag">Role: {profile?.role || 'admin'}</span>
                </div>

                <button
                  type="button"
                  className="btn-admin-logout"
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to log out?')) {
                      await signOut();
                    }
                  }}
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>

              {/* Password change form */}
              <div className="password-change-box">
                <div className="box-title">
                  <Lock size={18} />
                  <h3>Change Admin Password</h3>
                </div>

                {passwordMessage.text && (
                  <div className={`password-alert ${passwordMessage.type}`}>
                    {passwordMessage.type === 'success' ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      <AlertCircle size={16} />
                    )}
                    <span>{passwordMessage.text}</span>
                  </div>
                )}

                <form onSubmit={handleChangePassword}>
                  <div className="form-row">
                    <div className="form-group flex-1">
                      <label htmlFor="newPassword">New Password</label>
                      <div className="password-input-wrapper">
                        <input
                          id="newPassword"
                          type={showPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Minimum 6 characters"
                          minLength={6}
                          required
                        />
                        <button
                          type="button"
                          className="toggle-pw-visibility"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label="Toggle password visibility"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="form-group flex-1">
                      <label htmlFor="confirmPassword">Confirm New Password</label>
                      <div className="password-input-wrapper">
                        <input
                          id="confirmPassword"
                          type={showPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter new password"
                          minLength={6}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn-update-password"
                    disabled={passwordLoading}
                  >
                    {passwordLoading ? 'Updating Password...' : 'Update Password'}
                  </button>
                </form>
              </div>

              {/* Session details */}
              <div className="session-info-strip">
                <div>
                  <span className="session-label">Session Status:</span>
                  <span className="session-value">🟢 Active Authenticated Session</span>
                </div>
                <div>
                  <span className="session-label">Authentication Engine:</span>
                  <span className="session-value">Supabase Auth (JWT Secured)</span>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="settings-bottom-bar">
        <span>Unsaved changes will be lost if you leave this tab without saving.</span>
        <div className="bottom-bar-actions">
          <button
            type="button"
            className="btn-settings-reset"
            onClick={handleResetSettings}
            disabled={saving}
          >
            Discard
          </button>
          <button
            type="button"
            className="btn-settings-save"
            onClick={handleSaveSettings}
            disabled={saving}
          >
            <Save size={16} /> {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
