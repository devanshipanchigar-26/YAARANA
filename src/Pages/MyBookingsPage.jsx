import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Plus,
  MessageSquare,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import './MyBookingsPage.css';

const pad = (n) => String(n).padStart(2, '0');
const toDateString = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const prettyDate = (dateString) => {
  if (!dateString) return '';
  const today = toDateString(new Date());
  if (dateString === today) return 'Today';

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (dateString === toDateString(tomorrow)) return 'Tomorrow';

  try {
    return new Date(`${dateString}T00:00:00`).toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

export default function MyBookingsPage({ onNavigateToMenu, onNavigateToBookTable, onBackHome }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, loading: authLoading } = useAuth();

  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'past' | 'all'
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Cancellation modal state
  const [cancellingBooking, setCancellingBooking] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState('');

  const todayStr = toDateString(new Date());

  // Protect route - require authentication
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', {
        state: { returnUrl: location.pathname },
        replace: true,
      });
    }
  }, [user, authLoading, navigate, location.pathname]);

  // Load customer reservations
  const fetchMyBookings = async (isSilent = false) => {
    if (!user?.id) return;
    if (!isSilent && bookings.length === 0) setLoading(true);
    if (isSilent) setIsRefreshing(true);

    try {
      // 1. Try querying by user_id
      let query = supabase
        .from('table_reservations')
        .select('*')
        .order('booking_date', { ascending: false })
        .order('booking_time', { ascending: false });

      let { data, error: fetchErr } = await query.eq('user_id', user.id);

      // 2. Graceful fallback if user_id column is not yet migrated in Supabase
      if (fetchErr && fetchErr.message && fetchErr.message.includes('user_id')) {
        const phone = profile?.phone || user?.user_metadata?.phone || user?.phone || '';
        const name = profile?.name || user?.user_metadata?.name || '';
        
        let fallbackQuery = supabase
          .from('table_reservations')
          .select('*')
          .order('booking_date', { ascending: false })
          .order('booking_time', { ascending: false });

        if (phone && name) {
          const res = await fallbackQuery.or(`customer_phone.eq."${phone}",customer_name.eq."${name}"`);
          data = res.data;
          fetchErr = res.error;
        } else if (phone) {
          const res = await fallbackQuery.eq('customer_phone', phone);
          data = res.data;
          fetchErr = res.error;
        } else if (name) {
          const res = await fallbackQuery.eq('customer_name', name);
          data = res.data;
          fetchErr = res.error;
        } else {
          data = [];
          fetchErr = null;
        }
      }

      if (fetchErr) throw fetchErr;

      setBookings(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching customer bookings:', err);
      if (bookings.length === 0) {
        setError('Could not load your reservations. Please check your connection.');
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchMyBookings();

      // Subscribe to realtime updates for reservations
      const channel = supabase
        .channel(`my-reservations-${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'table_reservations' },
          () => {
            fetchMyBookings(true);
          }
        )
        .subscribe();

      // Polling fallback every 4.5 seconds
      const interval = setInterval(() => {
        fetchMyBookings(true);
      }, 4500);

      return () => {
        supabase.removeChannel(channel);
        clearInterval(interval);
      };
    }
  }, [user?.id]);

  // Customer cancellation handler
  const handleConfirmCancel = async () => {
    if (!cancellingBooking) return;
    setIsCancelling(true);

    try {
      const { error: cancelErr } = await supabase
        .from('table_reservations')
        .update({ status: 'Cancelled' })
        .eq('id', cancellingBooking.id);

      if (cancelErr) throw cancelErr;

      setBookings((prev) =>
        prev.map((b) => (b.id === cancellingBooking.id ? { ...b, status: 'Cancelled' } : b))
      );

      setCancelSuccessMsg(`Reservation #RES-${cancellingBooking.id} has been cancelled.`);
      setCancellingBooking(null);
      setTimeout(() => setCancelSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error cancelling reservation:', err);
      alert('Could not cancel reservation: ' + err.message);
    } finally {
      setIsCancelling(false);
    }
  };

  // Filter bookings based on activeTab
  const filteredBookings = bookings.filter((booking) => {
    const isPastDate = booking.booking_date < todayStr;
    const isCancelled = (booking.status || '').toLowerCase() === 'cancelled';
    const isCompleted = (booking.status || '').toLowerCase() === 'completed';

    if (activeTab === 'upcoming') {
      return !isPastDate && !isCancelled && !isCompleted;
    }
    if (activeTab === 'past') {
      return isPastDate || isCancelled || isCompleted;
    }
    return true; // 'all'
  });

  const upcomingCount = bookings.filter((b) => {
    const isPastDate = b.booking_date < todayStr;
    const isCancelled = (b.status || '').toLowerCase() === 'cancelled';
    const isCompleted = (b.status || '').toLowerCase() === 'completed';
    return !isPastDate && !isCancelled && !isCompleted;
  }).length;

  if (authLoading || (!user && loading)) {
    return (
      <div className="myb-loading-screen">
        <RefreshCw size={32} className="myb-spin-icon" style={{ color: '#FFD000' }} />
        <p>Loading your reservations...</p>
      </div>
    );
  }

  return (
    <div className="my-bookings-page">
      {/* Top Header matching My Orders */}
      <header className="my-orders-header">
        <div className="header-inner">
          <button
            type="button"
            className="btn-header-back"
            onClick={() => navigate('/profile')}
            title="Back to Profile"
          >
            <ArrowLeft size={18} /> Profile
          </button>
          <div className="header-brand">
            <span className="brand-title">YAARANA</span>
            <span className="brand-sub">
              <span className="pulse-dot" /> My Bookings & Table Tracker
            </span>
          </div>
          <button
            type="button"
            className="btn-header-refresh"
            onClick={() => fetchMyBookings(false)}
            title="Refresh Reservations"
            disabled={isRefreshing}
          >
            <RefreshCw size={16} className={isRefreshing ? 'spin-icon' : ''} />
          </button>
        </div>
      </header>

      <div className="myb-container">
        {/* TABS & RESERVE ACTION TOOLBAR */}
        <div className="myb-toolbar-row">
          <div className="myb-tabs-bar">
            <button
              type="button"
              className={`myb-tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
              onClick={() => setActiveTab('upcoming')}
            >
              Upcoming Reservations ({upcomingCount})
            </button>
            <button
              type="button"
              className={`myb-tab-btn ${activeTab === 'past' ? 'active' : ''}`}
              onClick={() => setActiveTab('past')}
            >
              Past & Cancelled
            </button>
            <button
              type="button"
              className={`myb-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All Bookings ({bookings.length})
            </button>
          </div>

          <button
            type="button"
            className="myb-book-new-btn"
            onClick={() => {
              if (onNavigateToBookTable) onNavigateToBookTable();
              else navigate('/');
            }}
          >
            <Plus size={16} /> Reserve a Table
          </button>
        </div>

        {/* CANCELLATION SUCCESS BANNER */}
        {cancelSuccessMsg && (
          <div className="myb-alert-banner success">
            <CheckCircle2 size={18} />
            <span>{cancelSuccessMsg}</span>
          </div>
        )}

        {/* ERROR BANNER */}
        {error && (
          <div className="myb-alert-banner error">
            <AlertCircle size={18} />
            <span>{error}</span>
            <button type="button" onClick={() => fetchMyBookings(false)}>Retry</button>
          </div>
        )}

        {/* BOOKINGS LIST */}
        <div className="myb-content-area">
          {loading ? (
            <div className="myb-empty-box">
              <RefreshCw size={28} className="myb-spin-icon" style={{ color: '#E67E22', margin: '0 auto 12px' }} />
              <p>Fetching your reservations from YAARANA...</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="myb-empty-box">
              <Calendar size={40} style={{ color: '#8C756B', margin: '0 auto 14px' }} />
              <h3>
                {activeTab === 'upcoming'
                  ? 'No Upcoming Table Reservations'
                  : 'No Reservation History Found'}
              </h3>
              <p>
                {activeTab === 'upcoming'
                  ? "You don't have any active bookings scheduled right now. Ready for delicious food & cozy vibes?"
                  : 'You have not completed or cancelled any reservations yet.'}
              </p>
              {activeTab === 'upcoming' && (
                <button
                  type="button"
                  className="myb-empty-action-btn"
                  onClick={() => {
                    if (onNavigateToBookTable) onNavigateToBookTable();
                    else navigate('/');
                  }}
                >
                  <UtensilsCrossed size={16} /> Book a Table Now
                </button>
              )}
            </div>
          ) : (
            <div className="myb-cards-grid">
              {filteredBookings.map((booking) => {
                const normStatus = (booking.status || 'Confirmed').toLowerCase();
                const isUpcomingActive =
                  booking.booking_date >= todayStr && normStatus === 'confirmed';
                const isToday = booking.booking_date === todayStr;

                return (
                  <div
                    key={booking.id}
                    className={`myb-card status-${normStatus} ${isToday ? 'is-today' : ''}`}
                  >
                    {/* CARD HEADER */}
                    <div className="myb-card-top">
                      <div className="myb-card-meta-left">
                        <span className="myb-id-pill">#RES-{booking.id}</span>
                        <span className="myb-table-pill">🍽️ Table {booking.table_no}</span>
                        {isToday && <span className="myb-today-tag">⚡ TODAY</span>}
                      </div>

                      <div className="myb-status-badge">
                        <span className={`myb-status-pill status-${normStatus}`}>
                          {normStatus === 'confirmed' && '✓ Confirmed'}
                          {normStatus === 'completed' && '🎉 Completed'}
                          {normStatus === 'cancelled' && '✕ Cancelled'}
                          {normStatus !== 'confirmed' &&
                            normStatus !== 'completed' &&
                            normStatus !== 'cancelled' &&
                            booking.status}
                        </span>
                      </div>
                    </div>

                    {/* CARD BODY DETAILS */}
                    <div className="myb-card-body">
                      <div className="myb-details-row">
                        <div className="myb-detail-item">
                          <Calendar size={15} className="myb-icon" />
                          <div>
                            <span className="myb-label">Date</span>
                            <strong>
                              {prettyDate(booking.booking_date)}
                              <span className="myb-date-iso"> ({booking.booking_date})</span>
                            </strong>
                          </div>
                        </div>

                        <div className="myb-detail-item">
                          <Clock size={15} className="myb-icon" />
                          <div>
                            <span className="myb-label">Time Slot</span>
                            <strong>{booking.booking_time}</strong>
                          </div>
                        </div>

                        <div className="myb-detail-item">
                          <Users size={15} className="myb-icon" />
                          <div>
                            <span className="myb-label">Guests</span>
                            <strong>
                              {booking.guest_count} {booking.guest_count === 1 ? 'Guest' : 'Guests'}
                            </strong>
                          </div>
                        </div>

                        <div className="myb-detail-item">
                          <span className="myb-icon" style={{ fontSize: '14px' }}>🪑</span>
                          <div>
                            <span className="myb-label">Reserved Table</span>
                            <strong>Table {booking.table_no}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Special Requests */}
                      {booking.special_request && (
                        <div className="myb-special-note">
                          <MessageSquare size={14} className="myb-note-icon" />
                          <div>
                            <span className="myb-note-label">Special Request:</span>
                            <p className="myb-note-text">"{booking.special_request}"</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* CARD FOOTER & ACTIONS */}
                    <div className="myb-card-footer">
                      <span className="myb-booked-time">
                        Guest: <strong>{booking.customer_name}</strong>
                      </span>

                      {/* Cancel Action (only permitted if confirmed and upcoming) */}
                      {isUpcomingActive && (
                        <button
                          type="button"
                          className="myb-cancel-btn"
                          onClick={() => setCancellingBooking(booking)}
                          title="Cancel this reservation"
                        >
                          <XCircle size={14} /> Cancel Booking
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* CONFIRM CANCELLATION MODAL */}
      {cancellingBooking && (
        <div className="myb-modal-overlay">
          <div className="myb-modal-card">
            <div className="myb-modal-header">
              <div className="myb-warning-circle">
                <AlertCircle size={24} />
              </div>
              <h3>Cancel Table Reservation?</h3>
              <button
                type="button"
                className="myb-close-modal-btn"
                onClick={() => setCancellingBooking(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="myb-modal-body">
              <p>
                Are you sure you want to cancel your reservation{' '}
                <strong>#RES-{cancellingBooking.id}</strong>?
              </p>

              <div className="myb-cancel-summary-box">
                <p>
                  <span>Table:</span> <strong>Table {cancellingBooking.table_no}</strong>
                </p>
                <p>
                  <span>Date & Time:</span>{' '}
                  <strong>
                    {prettyDate(cancellingBooking.booking_date)} at {cancellingBooking.booking_time}
                  </strong>
                </p>
                <p>
                  <span>Guests:</span>{' '}
                  <strong>{cancellingBooking.guest_count} Guests</strong>
                </p>
              </div>

              <p className="myb-cancel-notice">
                Cancelling will release Table {cancellingBooking.table_no} for other guests.
                This cannot be undone.
              </p>
            </div>

            <div className="myb-modal-actions">
              <button
                type="button"
                className="myb-btn-secondary"
                onClick={() => setCancellingBooking(null)}
                disabled={isCancelling}
              >
                Keep Reservation
              </button>
              <button
                type="button"
                className="myb-btn-danger"
                onClick={handleConfirmCancel}
                disabled={isCancelling}
              >
                {isCancelling ? 'Cancelling...' : 'Yes, Cancel Reservation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
