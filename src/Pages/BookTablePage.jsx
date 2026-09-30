import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const TIME_SLOTS = ['11:00 AM', '01:00 PM', '04:00 PM', '06:00 PM', '08:00 PM', '09:30 PM'];

const COLORS = {
  bg: '#F8F3EA',
  brown: '#311E18',
  yellow: '#FFD000',
  blue: '#0A84FF',
  wood: '#F3E9DA',
  muted: '#9A8C80',
  border: '#D1C7BD',
};

const pad = (n) => String(n).padStart(2, '0');
const toDateString = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// "06:00 PM" -> minutes since midnight
const slotMinutes = (slot) => {
  const [time, period] = slot.split(' ');
  let [h, m] = time.split(':').map(Number);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return h * 60 + m;
};

const isPastSlot = (dateString, slot) => {
  const now = new Date();
  if (dateString !== toDateString(now)) return false;
  return slotMinutes(slot) <= now.getHours() * 60 + now.getMinutes();
};

const prettyDate = (dateString) =>
  new Date(`${dateString}T00:00:00`).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

export default function BookTablePage() {
  const today = toDateString(new Date());

  const [tables, setTables] = useState([]);
  const [booked, setBooked] = useState(new Set());
  const [date, setDate] = useState(today);
  const [time, setTime] = useState(
    TIME_SLOTS.find((slot) => !isPastSlot(today, slot)) || TIME_SLOTS[0]
  );
  const [guests, setGuests] = useState(2);
  const [selectedTable, setSelectedTable] = useState(null);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [specialRequest, setSpecialRequest] = useState('');

  const [loadingBooked, setLoadingBooked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState('');
  const [bookError, setBookError] = useState('');
  const [confirmation, setConfirmation] = useState(null);

  // Load the list of tables once
  useEffect(() => {
    const loadTables = async () => {
      const { data, error } = await supabase
        .from('cafe_tables')
        .select('*')
        .order('display_order')
        .order('id');
      if (error) {
        console.error('Error loading tables:', error.message);
        setPageError('Could not load the tables. Please try again.');
        return;
      }
      setTables(data || []);
    };
    loadTables();
  }, []);

  // Which tables are already booked for this date + time
  const loadBooked = useCallback(async () => {
    setLoadingBooked(true);
    setPageError('');
    const { data, error } = await supabase.rpc('get_booked_tables', {
      p_date: date,
      p_time: time,
    });
    if (error) {
      console.error('Error loading availability:', error.message);
      setPageError('Could not check which tables are booked. Please try again.');
      setBooked(new Set());
    } else {
      setBooked(new Set((data || []).map((row) => String(row.booked_table_no))));
    }
    setLoadingBooked(false);
  }, [date, time]);

  useEffect(() => {
    loadBooked();
  }, [loadBooked]);

  // A different date or time is a different set of bookings
  useEffect(() => {
    setSelectedTable(null);
    setBookError('');
  }, [date, time]);

  const handleDateChange = (value) => {
    setDate(value);
    // If today is picked and the chosen time has passed, jump to the next free slot
    if (isPastSlot(value, time)) {
      const next = TIME_SLOTS.find((slot) => !isPastSlot(value, slot));
      if (next) setTime(next);
    }
  };

  const handleGuestsChange = (value) => {
    const count = Number(value);
    setGuests(count);
    if (selectedTable && selectedTable.seats < count) setSelectedTable(null);
  };

  const maxSeats = Math.min(Math.max(...tables.map((t) => t.seats), 2), 12);
  const guestOptions = Array.from({ length: maxSeats }, (_, i) => i + 1);
  const allSlotsPassed = TIME_SLOTS.every((slot) => isPastSlot(date, slot));
  const freeCount = tables.filter(
    (t) => !booked.has(String(t.table_no)) && t.seats >= guests
  ).length;

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!selectedTable) return;
    setSaving(true);
    setBookError('');

    const { error } = await supabase.from('table_reservations').insert([
      {
        customer_name: customerName,
        customer_phone: customerPhone,
        guest_count: guests,
        booking_date: date,
        booking_time: time,
        special_request: specialRequest,
        table_no: selectedTable.table_no,
      },
    ]);

    if (error) {
      console.error('Error reserving table:', error.message);
      if (error.code === '23505') {
        setBookError('Someone just booked that table for this time. Please pick another one.');
        setSelectedTable(null);
        loadBooked();
      } else {
        setBookError('Could not book the table: ' + error.message);
      }
      setSaving(false);
      return;
    }

    setConfirmation({
      name: customerName,
      tableNo: selectedTable.table_no,
      seats: selectedTable.seats,
      date,
      time,
      guests,
    });
    setSaving(false);
  };

  const startAgain = () => {
    setConfirmation(null);
    setSelectedTable(null);
    setCustomerName('');
    setCustomerPhone('');
    setSpecialRequest('');
    loadBooked();
  };

  const renderTable = (table) => {
    const isBooked = booked.has(String(table.table_no));
    const tooSmall = table.seats < guests;
    const isSelected = selectedTable?.id === table.id;
    const disabled = isBooked || tooSmall;

    let status = 'Free';
    let className = 'free';
    if (isBooked) {
      status = 'Booked';
      className = 'booked';
    } else if (tooSmall) {
      status = 'Too small';
      className = 'small';
    } else if (isSelected) {
      status = 'Selected';
      className = 'selected';
    }

    const top = Math.ceil(table.seats / 2);
    const bottom = Math.floor(table.seats / 2);
    const width = 56 + table.seats * 10;

    return (
      <button
        key={table.id}
        type="button"
        className={`bt-table ${className}`}
        disabled={disabled}
        aria-pressed={isSelected}
        aria-label={`Table ${table.table_no}, ${table.seats} seats, ${status}`}
        onClick={() => setSelectedTable(table)}
      >
        <span className="bt-chairs">
          {Array.from({ length: top }).map((_, i) => (
            <span className="bt-chair" key={i} />
          ))}
        </span>
        <span className="bt-surface" style={{ width }}>
          <span className="bt-no">{table.table_no}</span>
        </span>
        <span className="bt-chairs">
          {Array.from({ length: bottom }).map((_, i) => (
            <span className="bt-chair" key={i} />
          ))}
        </span>
        <span className="bt-seats">{table.seats} seats</span>
        <span className="bt-status">{status}</span>
      </button>
    );
  };

  return (
    <div className="bt-page">
      <style>{`
        .bt-page { height: 100vh; height: 100dvh; overflow-y: auto; -webkit-overflow-scrolling: touch; background: ${COLORS.bg}; padding: 120px 16px 60px; box-sizing: border-box; color: ${COLORS.brown}; }
        .bt-wrap { max-width: 760px; margin: 0 auto; }
        .bt-title { font-family: 'Luckiest Guy', cursive; font-weight: 400; color: ${COLORS.blue}; font-size: 2.4rem; letter-spacing: 1px; margin: 0; }
        .bt-sub { margin: 8px 0 28px; color: #6B5A50; }

        .bt-card { background: #FFF; border-radius: 20px; padding: 24px; box-shadow: 0 4px 18px rgba(49,30,24,0.10); margin-bottom: 20px; }
        .bt-step { display: flex; align-items: center; gap: 10px; margin: 0 0 16px; font-size: 1.1rem; }
        .bt-step-no { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; background: ${COLORS.yellow}; font-weight: 800; font-size: 0.9rem; }

        .bt-row { display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 18px; }
        .bt-field { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 150px; }
        .bt-label { font-weight: 700; font-size: 0.85rem; }
        .bt-input { padding: 11px 14px; border-radius: 10px; border: 1px solid ${COLORS.border}; font-size: 1rem; font-family: inherit; background: #FFF8EE; color: ${COLORS.brown}; outline: none; box-sizing: border-box; width: 100%; height: 46px; }
        .bt-input:focus-visible { box-shadow: 0 0 0 3px ${COLORS.yellow}; }
        textarea.bt-input { height: auto; min-height: 80px; resize: vertical; }

        .bt-slots { display: flex; flex-wrap: wrap; gap: 10px; }
        .bt-slot { padding: 9px 16px; border-radius: 20px; border: 2px solid ${COLORS.brown}; background: #FFF; color: ${COLORS.brown}; font-weight: 700; font-family: inherit; cursor: pointer; font-size: 0.9rem; }
        .bt-slot.active { background: ${COLORS.yellow}; }
        .bt-slot:disabled { opacity: 0.35; cursor: not-allowed; border-style: dashed; }
        .bt-slot:focus-visible { box-shadow: 0 0 0 3px ${COLORS.blue}; }

        .bt-legend { display: flex; flex-wrap: wrap; gap: 16px; margin: 0 0 18px; font-size: 0.8rem; }
        .bt-legend span { display: inline-flex; align-items: center; gap: 6px; }
        .bt-dot { width: 14px; height: 14px; border-radius: 4px; border: 2px solid ${COLORS.brown}; box-sizing: border-box; }
        .bt-dot.free { background: #FFF; }
        .bt-dot.selected { background: ${COLORS.yellow}; }
        .bt-dot.booked { background: #E4DDD3; border: 2px dashed ${COLORS.muted}; }

        .bt-floor { background: ${COLORS.bg}; border: 2px dashed ${COLORS.border}; border-radius: 16px; padding: 22px 16px; display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 18px; justify-items: center; }
        .bt-floor.loading { opacity: 0.5; pointer-events: none; }

        .bt-table { width: 116px; background: #FFF; border: 2px solid ${COLORS.brown}; border-radius: 16px; padding: 10px 6px 10px; display: flex; flex-direction: column; align-items: center; gap: 5px; font-family: inherit; color: ${COLORS.brown}; cursor: pointer; transition: transform .12s, box-shadow .12s; }
        .bt-table.free:hover { transform: translateY(-2px); box-shadow: 0 6px 14px rgba(49,30,24,0.18); }
        .bt-table:focus-visible { outline: 3px solid ${COLORS.blue}; outline-offset: 2px; }
        .bt-table.selected { background: ${COLORS.yellow}; box-shadow: 0 0 0 3px ${COLORS.brown}; }
        .bt-table.booked { background: #E4DDD3; border: 2px dashed ${COLORS.muted}; color: ${COLORS.muted}; cursor: not-allowed; }
        .bt-table.small { opacity: 0.4; cursor: not-allowed; }
        .bt-chairs { display: flex; gap: 6px; justify-content: center; min-height: 8px; }
        .bt-chair { width: 14px; height: 8px; border-radius: 4px; background: currentColor; opacity: 0.55; }
        .bt-surface { display: flex; align-items: center; justify-content: center; height: 46px; border-radius: 12px; background: ${COLORS.wood}; }
        .bt-table.selected .bt-surface { background: #FFF3B0; }
        .bt-table.booked .bt-surface { background: #D8D0C5; }
        .bt-no { font-family: 'Luckiest Guy', cursive; font-size: 1.5rem; }
        .bt-seats { font-size: 0.72rem; font-weight: 600; }
        .bt-status { font-size: 0.72rem; font-weight: 800; }

        .bt-hint { margin: 14px 0 0; font-size: 0.85rem; color: #6B5A50; }
        .bt-error { background: #FDECEA; color: #B3261E; border-radius: 10px; padding: 10px 14px; margin: 0 0 16px; font-size: 0.9rem; }
        .bt-summary { background: ${COLORS.bg}; border-radius: 12px; padding: 12px 16px; margin-bottom: 18px; font-weight: 700; }
        .bt-button { width: 100%; padding: 14px; background: ${COLORS.brown}; color: ${COLORS.yellow}; border: none; border-radius: 12px; font-weight: 800; font-size: 1.05rem; font-family: inherit; cursor: pointer; }
        .bt-button:disabled { opacity: 0.6; cursor: not-allowed; }
        .bt-success { text-align: center; }
        .bt-success h3 { font-family: 'Luckiest Guy', cursive; font-weight: 400; color: ${COLORS.blue}; font-size: 1.8rem; margin: 0 0 10px; }

        @media (max-width: 520px) {
          .bt-card { padding: 18px; }
          .bt-title { font-size: 1.9rem; }
        }
      `}</style>

      <div className="bt-wrap">
        <h2 className="bt-title">Book a table at Yaarana</h2>
        <p className="bt-sub">Pick a time, then choose your table from the floor.</p>

        {confirmation ? (
          <div className="bt-card bt-success">
            <h3>Table reserved!</h3>
            <p>
              See you soon, {confirmation.name}. Table {confirmation.tableNo} ({confirmation.seats} seats) is yours for{' '}
              {confirmation.guests} {confirmation.guests === 1 ? 'guest' : 'guests'} on {prettyDate(confirmation.date)} at{' '}
              {confirmation.time}.
            </p>
            <button type="button" className="bt-button" style={{ maxWidth: 260 }} onClick={startAgain}>
              Book another table
            </button>
          </div>
        ) : (
          <>
            {pageError && <p className="bt-error">{pageError}</p>}

            {/* Date, guests, time */}
            <div className="bt-card">
              <h3 className="bt-step">
                <span className="bt-step-no">1</span> Date, guests and time
              </h3>
              <div className="bt-row">
                <div className="bt-field">
                  <label className="bt-label" htmlFor="bt-date">Date</label>
                  <input
                    id="bt-date"
                    className="bt-input"
                    type="date"
                    min={today}
                    value={date}
                    onChange={(e) => e.target.value && handleDateChange(e.target.value)}
                  />
                </div>
                <div className="bt-field">
                  <label className="bt-label" htmlFor="bt-guests">Guests</label>
                  <select
                    id="bt-guests"
                    className="bt-input"
                    value={guests}
                    onChange={(e) => handleGuestsChange(e.target.value)}
                  >
                    {guestOptions.map((n) => (
                      <option key={n} value={n}>{n} {n === 1 ? 'guest' : 'guests'}</option>
                    ))}
                  </select>
                </div>
              </div>

              <span className="bt-label">Time</span>
              <div className="bt-slots" style={{ marginTop: 8 }}>
                {TIME_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    className={`bt-slot ${time === slot ? 'active' : ''}`}
                    disabled={isPastSlot(date, slot)}
                    aria-pressed={time === slot}
                    onClick={() => setTime(slot)}
                  >
                    {slot}
                  </button>
                ))}
              </div>
              {allSlotsPassed && (
                <p className="bt-hint">All of today's time slots have passed. Pick another date.</p>
              )}
            </div>

            {/* Table map */}
            <div className="bt-card">
              <h3 className="bt-step">
                <span className="bt-step-no">2</span> Choose your table
              </h3>

              <div className="bt-legend">
                <span><i className="bt-dot free" /> Free</span>
                <span><i className="bt-dot selected" /> Your pick</span>
                <span><i className="bt-dot booked" /> Already booked</span>
              </div>

              {tables.length === 0 && !pageError ? (
                <p className="bt-hint">Loading tables...</p>
              ) : (
                <div className={`bt-floor ${loadingBooked ? 'loading' : ''}`}>
                  {tables.map(renderTable)}
                </div>
              )}

              {tables.length > 0 && !loadingBooked && (
                <p className="bt-hint">
                  {freeCount === 0
                    ? `No free table for ${guests} ${guests === 1 ? 'guest' : 'guests'} at ${time}. Try another time or date.`
                    : `${freeCount} of ${tables.length} tables are free for ${guests} ${guests === 1 ? 'guest' : 'guests'} at ${time}.`}
                </p>
              )}
            </div>

            {/* Details */}
            <form className="bt-card" onSubmit={handleBooking}>
              <h3 className="bt-step">
                <span className="bt-step-no">3</span> Your details
              </h3>

              {selectedTable ? (
                <div className="bt-summary">
                  Table {selectedTable.table_no} ({selectedTable.seats} seats) · {prettyDate(date)} · {time}
                </div>
              ) : (
                <p className="bt-hint" style={{ marginTop: 0, marginBottom: 16 }}>
                  Select a free table above to continue.
                </p>
              )}

              {bookError && <p className="bt-error">{bookError}</p>}

              <div className="bt-row">
                <div className="bt-field">
                  <label className="bt-label" htmlFor="bt-name">Full name</label>
                  <input
                    id="bt-name"
                    className="bt-input"
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                  />
                </div>
                <div className="bt-field">
                  <label className="bt-label" htmlFor="bt-phone">Phone number</label>
                  <input
                    id="bt-phone"
                    className="bt-input"
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    pattern="[0-9+ ]{10,15}"
                    title="Enter a valid phone number"
                    required
                  />
                </div>
              </div>

              <div className="bt-field" style={{ marginBottom: 18 }}>
                <label className="bt-label" htmlFor="bt-request">Special requests / occasion</label>
                <textarea
                  id="bt-request"
                  className="bt-input"
                  value={specialRequest}
                  onChange={(e) => setSpecialRequest(e.target.value)}
                  placeholder="Birthday, high chair, cake arriving..."
                />
              </div>

              <button type="submit" className="bt-button" disabled={saving || !selectedTable}>
                {saving ? 'Booking...' : selectedTable ? `Book table ${selectedTable.table_no}` : 'Select a table first'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}