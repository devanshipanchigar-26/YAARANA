import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  Clock,
  User,
  Phone,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
  Edit2,
  X,
  Check,
  MessageSquare,
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import './TableBookingsPage.css';

export default function TableBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'confirmed' | 'completed' | 'cancelled'
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'today' | 'upcoming' | 'past'

  // Modal for reassigning table
  const [reassigningBooking, setReassigningBooking] = useState(null);
  const [newTableNo, setNewTableNo] = useState('');
  const [reassignSaving, setReassignSaving] = useState(false);

  // Status updating indicator
  const [updatingId, setUpdatingId] = useState(null);

  const pad = (n) => String(n).padStart(2, '0');
  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const todayStr = getTodayStr();

  useEffect(() => {
    fetchBookings();
    fetchTables();

    // Supabase Realtime channel for live bookings update
    const channel = supabase
      .channel('table-reservations-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'table_reservations' },
        () => {
          fetchBookings(true);
        }
      )
      .subscribe();

    // Fallback polling every 5 seconds to guarantee fresh data
    const interval = setInterval(() => {
      fetchBookings(true);
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const fetchTables = async () => {
    try {
      const { data, error } = await supabase
        .from('cafe_tables')
        .select('*')
        .order('display_order', { ascending: true })
        .order('id', { ascending: true });
      if (error) throw error;
      setTables(data || []);
    } catch (err) {
      console.warn('Error fetching cafe tables:', err.message);
    }
  };

  const fetchBookings = async (isSilent = false) => {
    if (!isSilent && bookings.length === 0) setLoading(true);
    if (isSilent) setIsRefreshing(true);

    try {
      const { data, error } = await supabase
        .from('table_reservations')
        .select('*')
        .order('booking_date', { ascending: false })
        .order('booking_time', { ascending: false })
        .order('id', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (err) {
      console.error('Error fetching table reservations:', err.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Update Status in Supabase
  const handleUpdateStatus = async (bookingId, nextStatus) => {
    setUpdatingId(bookingId);
    try {
      const { error } = await supabase
        .from('table_reservations')
        .update({ status: nextStatus })
        .eq('id', bookingId);

      if (error) throw error;

      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: nextStatus } : b))
      );
    } catch (err) {
      console.error('Error updating booking status:', err.message);
      alert('Failed to update booking status: ' + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  // Reassign Table
  const handleOpenReassign = (booking) => {
    setReassigningBooking(booking);
    setNewTableNo(booking.table_no || '');
  };

  const handleSaveReassign = async (e) => {
    e.preventDefault();
    if (!reassigningBooking || !newTableNo) return;
    setReassignSaving(true);

    try {
      const { error } = await supabase
        .from('table_reservations')
        .update({ table_no: String(newTableNo) })
        .eq('id', reassigningBooking.id);

      if (error) throw error;

      setBookings((prev) =>
        prev.map((b) =>
          b.id === reassigningBooking.id ? { ...b, table_no: String(newTableNo) } : b
        )
      );
      setReassigningBooking(null);
    } catch (err) {
      console.error('Error reassigning table:', err.message);
      alert('Failed to reassign table: ' + err.message);
    } finally {
      setReassignSaving(false);
    }
  };

  // Metrics calculation
  const todayBookings = bookings.filter((b) => b.booking_date === todayStr);
  const activeConfirmedCount = bookings.filter(
    (b) => (b.status || 'Confirmed').toLowerCase() === 'confirmed'
  ).length;
  const completedCount = bookings.filter(
    (b) => (b.status || '').toLowerCase() === 'completed'
  ).length;
  const todayGuestsCount = todayBookings.reduce(
    (sum, b) => sum + (Number(b.guest_count) || 0),
    0
  );

  // Filtering & Searching logic
  const filteredBookings = bookings.filter((booking) => {
    // 1. Status Filter
    const normStatus = (booking.status || 'Confirmed').toLowerCase();
    if (statusFilter !== 'all' && normStatus !== statusFilter) {
      return false;
    }

    // 2. Date Filter
    if (dateFilter === 'today' && booking.booking_date !== todayStr) {
      return false;
    }
    if (dateFilter === 'upcoming' && booking.booking_date < todayStr) {
      return false;
    }
    if (dateFilter === 'past' && booking.booking_date >= todayStr) {
      return false;
    }

    // 3. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const idMatch =
        String(booking.id).includes(q) ||
        `#res-${booking.id}`.toLowerCase().includes(q) ||
        `res-${booking.id}`.toLowerCase().includes(q);
      const nameMatch = (booking.customer_name || '').toLowerCase().includes(q);
      const phoneMatch = (booking.customer_phone || '').toLowerCase().includes(q);
      const tableMatch = `table ${booking.table_no}`.toLowerCase().includes(q) || String(booking.table_no) === q;

      if (!idMatch && !nameMatch && !phoneMatch && !tableMatch) {
        return false;
      }
    }

    return true;
  });

  const formatFriendlyDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    if (dateStr === todayStr) return 'Today';
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;
    if (dateStr === tomStr) return 'Tomorrow';

    try {
      const d = new Date(`${dateStr}T00:00:00`);
      return d.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatCreatedTime = (isoStr) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="table-bookings-page">
      {/* PAGE HEADER */}
      <div className="tb-page-header">
        <div className="tb-header-titles">
          <h2 className="admin-page-title">Table Reservations</h2>
          <p className="tb-header-sub">
            Real-time customer table bookings, seating management & requests
          </p>
        </div>

        <div className="tb-header-actions">
          <span className="live-indicator-pill">
            <span className="live-dot" /> Live Sync Active
          </span>
          <button
            type="button"
            className="tb-btn-refresh"
            onClick={() => fetchBookings(false)}
            disabled={isRefreshing}
            title="Refresh bookings list"
          >
            <RefreshCw size={15} className={isRefreshing ? 'spin-icon' : ''} />
            {isRefreshing ? 'Syncing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* METRICS SUMMARY CARDS */}
      <div className="tb-metrics-grid">
        <div className="tb-metric-card highlight-amber">
          <span className="metric-label">Today's Bookings</span>
          <strong className="metric-value">{todayBookings.length}</strong>
          <span className="metric-hint">Reservations scheduled for today</span>
        </div>

        <div className="tb-metric-card highlight-green">
          <span className="metric-label">Confirmed / Active</span>
          <strong className="metric-value">{activeConfirmedCount}</strong>
          <span className="metric-hint">Awaiting guest arrival</span>
        </div>

        <div className="tb-metric-card highlight-blue">
          <span className="metric-label">Completed / Seated</span>
          <strong className="metric-value">{completedCount}</strong>
          <span className="metric-hint">Successfully fulfilled</span>
        </div>

        <div className="tb-metric-card highlight-brown">
          <span className="metric-label">Today's Guests</span>
          <strong className="metric-value">{todayGuestsCount}</strong>
          <span className="metric-hint">Total covers expected today</span>
        </div>
      </div>

      {/* SEARCH AND FILTERS BAR */}
      <div className="tb-filters-bar">
        <div className="tb-search-wrap">
          <Search size={16} className="tb-search-icon" />
          <input
            type="text"
            className="tb-search-input"
            placeholder="Search by customer, phone, Table #, or #RES-ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="tb-search-clear-btn"
              onClick={() => setSearchQuery('')}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Date Filter Tabs */}
        <div className="tb-filter-group">
          <span className="tb-filter-group-label">Date:</span>
          <div className="tb-filter-tabs">
            <button
              type="button"
              className={`tb-tab-btn ${dateFilter === 'all' ? 'active' : ''}`}
              onClick={() => setDateFilter('all')}
            >
              All
            </button>
            <button
              type="button"
              className={`tb-tab-btn ${dateFilter === 'today' ? 'active' : ''}`}
              onClick={() => setDateFilter('today')}
            >
              Today
            </button>
            <button
              type="button"
              className={`tb-tab-btn ${dateFilter === 'upcoming' ? 'active' : ''}`}
              onClick={() => setDateFilter('upcoming')}
            >
              Upcoming
            </button>
            <button
              type="button"
              className={`tb-tab-btn ${dateFilter === 'past' ? 'active' : ''}`}
              onClick={() => setDateFilter('past')}
            >
              Past
            </button>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="tb-filter-group">
          <span className="tb-filter-group-label">Status:</span>
          <div className="tb-filter-tabs">
            <button
              type="button"
              className={`tb-tab-btn ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All
            </button>
            <button
              type="button"
              className={`tb-tab-btn ${statusFilter === 'confirmed' ? 'active' : ''}`}
              onClick={() => setStatusFilter('confirmed')}
            >
              Confirmed
            </button>
            <button
              type="button"
              className={`tb-tab-btn ${statusFilter === 'completed' ? 'active' : ''}`}
              onClick={() => setStatusFilter('completed')}
            >
              Completed
            </button>
            <button
              type="button"
              className={`tb-tab-btn ${statusFilter === 'cancelled' ? 'active' : ''}`}
              onClick={() => setStatusFilter('cancelled')}
            >
              Cancelled
            </button>
          </div>
        </div>
      </div>

      {/* BOOKINGS LIST STACK */}
      <div className="tb-bookings-container">
        {loading ? (
          <div className="tb-empty-state">
            <RefreshCw size={28} className="spin-icon" style={{ color: '#E67E22', margin: '0 auto 12px' }} />
            <p>Loading table reservations from database...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="tb-empty-state">
            <Calendar size={36} style={{ color: '#8C756B', margin: '0 auto 12px' }} />
            <h4>No Table Reservations Found</h4>
            <p>
              {searchQuery || statusFilter !== 'all' || dateFilter !== 'all'
                ? 'No bookings match your current filter criteria. Try clearing filters.'
                : 'No customer table reservations have been booked yet.'}
            </p>
            {(searchQuery || statusFilter !== 'all' || dateFilter !== 'all') && (
              <button
                type="button"
                className="tb-btn-reset-filters"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setDateFilter('all');
                }}
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="tb-cards-list">
            {filteredBookings.map((booking) => {
              const normStatus = (booking.status || 'Confirmed').toLowerCase();
              const isToday = booking.booking_date === todayStr;
              const isUpdating = updatingId === booking.id;

              return (
                <div
                  key={booking.id}
                  className={`tb-booking-card status-card-${normStatus} ${isToday ? 'is-today-booking' : ''}`}
                >
                  {/* CARD HEADER */}
                  <div className="tb-card-top">
                    <div className="tb-card-id-row">
                      <span className="tb-badge-id">#RES-{booking.id}</span>
                      <span className="tb-badge-table">🍽️ Table {booking.table_no}</span>
                      {isToday && <span className="tb-badge-today">⚡ TODAY</span>}
                    </div>

                    <div className="tb-card-status-badge">
                      <span className={`tb-status-pill pill-${normStatus}`}>
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

                  {/* CARD BODY */}
                  <div className="tb-card-body">
                    {/* Customer Info */}
                    <div className="tb-customer-section">
                      <div className="tb-cust-name-row">
                        <User size={15} className="tb-meta-icon" />
                        <strong>{booking.customer_name || 'Guest Customer'}</strong>
                      </div>

                      {booking.customer_phone && (
                        <div className="tb-cust-phone-row">
                          <Phone size={14} className="tb-meta-icon" />
                          <a
                            href={`tel:${booking.customer_phone}`}
                            className="tb-phone-link"
                            title="Call customer"
                          >
                            {booking.customer_phone}
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Reservation Details */}
                    <div className="tb-booking-details-grid">
                      <div className="tb-detail-item">
                        <Calendar size={14} className="tb-detail-icon" />
                        <div>
                          <span className="tb-detail-label">Date</span>
                          <strong className="tb-detail-val">
                            {formatFriendlyDate(booking.booking_date)}
                            <span className="tb-date-sub"> ({booking.booking_date})</span>
                          </strong>
                        </div>
                      </div>

                      <div className="tb-detail-item">
                        <Clock size={14} className="tb-detail-icon" />
                        <div>
                          <span className="tb-detail-label">Slot Time</span>
                          <strong className="tb-detail-val">{booking.booking_time}</strong>
                        </div>
                      </div>

                      <div className="tb-detail-item">
                        <Users size={14} className="tb-detail-icon" />
                        <div>
                          <span className="tb-detail-label">Guests</span>
                          <strong className="tb-detail-val">
                            {booking.guest_count} {booking.guest_count === 1 ? 'Guest' : 'Guests'}
                          </strong>
                        </div>
                      </div>

                      <div className="tb-detail-item">
                        <span className="tb-detail-icon" style={{ fontSize: '13px' }}>🪑</span>
                        <div>
                          <span className="tb-detail-label">Assigned</span>
                          <strong className="tb-detail-val">
                            Table {booking.table_no}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Special Requests */}
                    {booking.special_request && (
                      <div className="tb-special-request-box">
                        <MessageSquare size={14} className="tb-request-icon" />
                        <div>
                          <span className="tb-request-label">Customer Request / Occasion:</span>
                          <p className="tb-request-text">"{booking.special_request}"</p>
                        </div>
                      </div>
                    )}

                    {/* Booking metadata footer */}
                    {booking.created_at && (
                      <div className="tb-card-meta-footer">
                        <span>Booked on: {formatCreatedTime(booking.created_at)}</span>
                      </div>
                    )}
                  </div>

                  {/* ACTION BUTTONS ROW */}
                  <div className="tb-card-actions">
                    {/* Mark as Completed / Seated */}
                    {normStatus === 'confirmed' && (
                      <button
                        type="button"
                        className="tb-btn-action btn-tb-complete"
                        onClick={() => handleUpdateStatus(booking.id, 'Completed')}
                        disabled={isUpdating}
                        title="Mark this reservation as completed (guests arrived/finished)"
                      >
                        <CheckCircle2 size={14} /> Mark Completed
                      </button>
                    )}

                    {/* Change / Reassign Table */}
                    {normStatus !== 'cancelled' && (
                      <button
                        type="button"
                        className="tb-btn-action btn-tb-reassign"
                        onClick={() => handleOpenReassign(booking)}
                        disabled={isUpdating}
                        title="Reassign to another table"
                      >
                        <Edit2 size={13} /> Change Table
                      </button>
                    )}

                    {/* Cancel Reservation */}
                    {normStatus === 'confirmed' && (
                      <button
                        type="button"
                        className="tb-btn-action btn-tb-cancel"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Are you sure you want to cancel reservation #RES-${booking.id} for ${booking.customer_name}?`
                            )
                          ) {
                            handleUpdateStatus(booking.id, 'Cancelled');
                          }
                        }}
                        disabled={isUpdating}
                        title="Cancel this reservation"
                      >
                        <XCircle size={14} /> Cancel
                      </button>
                    )}

                    {/* Re-confirm Cancelled Booking */}
                    {normStatus === 'cancelled' && (
                      <button
                        type="button"
                        className="tb-btn-action btn-tb-reconfirm"
                        onClick={() => handleUpdateStatus(booking.id, 'Confirmed')}
                        disabled={isUpdating}
                        title="Restore reservation to Confirmed"
                      >
                        <Check size={14} /> Re-confirm Booking
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* REASSIGN TABLE MODAL */}
      {reassigningBooking && (
        <div className="admin-confirm-overlay">
          <div className="admin-confirm-modal">
            <div className="admin-confirm-header">
              <Edit2 size={22} className="text-orange" />
              <h3>Reassign Table</h3>
            </div>

            <form onSubmit={handleSaveReassign}>
              <div className="admin-confirm-body">
                <p>
                  Reassign table for <strong>{reassigningBooking.customer_name}</strong> (
                  #RES-{reassigningBooking.id}):
                </p>

                <div className="confirm-amount-callout" style={{ border: '1.5px solid #311E18' }}>
                  <span>Current Table:</span>
                  <strong style={{ color: '#311E18', fontSize: '1.2rem' }}>
                    Table {reassigningBooking.table_no}
                  </strong>
                </div>

                <div style={{ margin: '14px 0' }}>
                  <label
                    style={{
                      display: 'block',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      color: '#6B554B',
                      marginBottom: '6px',
                    }}
                  >
                    Select New Table:
                  </label>
                  <select
                    className="tb-select-input"
                    value={newTableNo}
                    onChange={(e) => setNewTableNo(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Table --</option>
                    {tables.map((tbl) => (
                      <option key={tbl.id} value={tbl.table_no}>
                        Table {tbl.table_no} ({tbl.seats} seats)
                      </option>
                    ))}
                  </select>
                </div>

                <p className="confirm-cust-meta">
                  Date: <strong>{reassigningBooking.booking_date}</strong> • Slot:{' '}
                  <strong>{reassigningBooking.booking_time}</strong>
                </p>
                <p className="confirm-cust-meta">
                  Guests: <strong>{reassigningBooking.guest_count}</strong>
                </p>
              </div>

              <div className="admin-confirm-actions">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setReassigningBooking(null)}
                  disabled={reassignSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-modal-confirm"
                  disabled={reassignSaving || !newTableNo}
                >
                  {reassignSaving ? 'Updating...' : 'Save Reassignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
