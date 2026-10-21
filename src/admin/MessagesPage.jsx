import React, { useState, useEffect } from 'react';
import {
  Mail,
  Phone,
  CheckCircle,
  Clock,
  Trash2,
  Search,
  RefreshCw,
  MessageSquare,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import './MessagesPage.css';

export default function MessagesPage({ onMessageUpdated }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread' | 'read' | 'resolved'
  const [searchTerm, setSearchTerm] = useState('');
  const [actionInProgress, setActionInProgress] = useState(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      // 1. Fetch from Supabase contact_messages
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });

      let combined = [];
      if (!error && data) {
        combined = [...data];
      } else {
        console.warn('Supabase contact_messages fetch notice:', error?.message);
      }

      // 2. Fetch local backup messages if any exist
      try {
        const localRaw = localStorage.getItem('yaarana_pending_contact_messages');
        if (localRaw) {
          const localList = JSON.parse(localRaw);
          if (Array.isArray(localList)) {
            // Avoid duplicate ids
            const existingIds = new Set(combined.map((m) => m.id));
            for (const item of localList) {
              if (!existingIds.has(item.id)) {
                combined.push({ ...item, isLocal: true });
              }
            }
          }
        }
      } catch (localErr) {
        console.error('Error reading local messages:', localErr);
      }

      // Sort newest first
      combined.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      setMessages(combined);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    setActionInProgress(id);
    try {
      // Update in Supabase
      const { error } = await supabase
        .from('contact_messages')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) {
        console.warn('Could not update in Supabase, updating locally:', error.message);
      }

      // Update in local state
      setMessages((prev) =>
        prev.map((msg) => (msg.id === id ? { ...msg, status: newStatus } : msg))
      );

      // Update in localStorage if saved locally
      try {
        const localRaw = localStorage.getItem('yaarana_pending_contact_messages');
        if (localRaw) {
          const localList = JSON.parse(localRaw);
          const updated = localList.map((m) =>
            m.id === id ? { ...m, status: newStatus } : m
          );
          localStorage.setItem('yaarana_pending_contact_messages', JSON.stringify(updated));
        }
      } catch (e) {
        // ignore
      }
    } catch (err) {
      console.error('Error updating message status:', err);
    } finally {
      setActionInProgress(null);
      if (onMessageUpdated) onMessageUpdated();
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this customer inquiry?')) return;

    setActionInProgress(id);
    try {
      await supabase.from('contact_messages').delete().eq('id', id);

      setMessages((prev) => prev.filter((msg) => msg.id !== id));

      // Remove from localStorage if present
      try {
        const localRaw = localStorage.getItem('yaarana_pending_contact_messages');
        if (localRaw) {
          const localList = JSON.parse(localRaw);
          const updated = localList.filter((m) => m.id !== id);
          localStorage.setItem('yaarana_pending_contact_messages', JSON.stringify(updated));
        }
      } catch (e) {
        // ignore
      }
    } catch (err) {
      console.error('Error deleting message:', err);
    } finally {
      setActionInProgress(null);
      if (onMessageUpdated) onMessageUpdated();
    }
  };

  // Stats calculations
  const totalCount = messages.length;
  const unreadCount = messages.filter((m) => m.status === 'unread').length;
  const resolvedCount = messages.filter((m) => m.status === 'resolved').length;

  // Filtered list
  const filteredMessages = messages.filter((msg) => {
    // Tab filter
    if (filter === 'unread' && msg.status !== 'unread') return false;
    if (filter === 'read' && msg.status !== 'read') return false;
    if (filter === 'resolved' && msg.status !== 'resolved') return false;

    // Search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchName = msg.name?.toLowerCase().includes(term);
      const matchContact = msg.contact?.toLowerCase().includes(term);
      const matchMessage = msg.message?.toLowerCase().includes(term);
      return matchName || matchContact || matchMessage;
    }

    return true;
  });

  return (
    <div className="messages-admin-page">
      {/* Top Stats Cards */}
      <div className="messages-stats-grid">
        <div className="messages-stat-card">
          <p>Total Inquiries</p>
          <h3>{totalCount}</h3>
        </div>
        <div className="messages-stat-card unread">
          <p>Unread Messages</p>
          <h3>{unreadCount}</h3>
        </div>
        <div className="messages-stat-card resolved">
          <p>Resolved</p>
          <h3>{resolvedCount}</h3>
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div className="messages-controls-bar">
        <div className="messages-search-box">
          <Search size={16} color="#7D6B62" />
          <input
            type="text"
            placeholder="Search by customer name, phone, email, or keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="messages-filter-pills">
          <button
            type="button"
            className={`messages-pill-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({totalCount})
          </button>
          <button
            type="button"
            className={`messages-pill-btn ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => setFilter('unread')}
          >
            Unread ({unreadCount})
          </button>
          <button
            type="button"
            className={`messages-pill-btn ${filter === 'resolved' ? 'active' : ''}`}
            onClick={() => setFilter('resolved')}
          >
            Resolved ({resolvedCount})
          </button>
          <button
            type="button"
            className="messages-pill-btn"
            onClick={fetchMessages}
            title="Refresh inquiries"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Messages List */}
      {loading ? (
        <div className="messages-empty-state">
          <p>Loading customer messages from database...</p>
        </div>
      ) : filteredMessages.length === 0 ? (
        <div className="messages-empty-state">
          <MessageSquare size={48} color="#D6CBC2" style={{ margin: '0 auto 8px' }} />
          <h3>No Customer Messages Found</h3>
          <p>
            {searchTerm || filter !== 'all'
              ? 'Try adjusting your search terms or filters.'
              : 'Messages sent via the Contact Us page will show up here in real-time.'}
          </p>
        </div>
      ) : (
        <div className="messages-list">
          {filteredMessages.map((msg) => {
            const isEmail = msg.contact && msg.contact.includes('@');
            const cleanPhone = msg.contact ? msg.contact.replace(/[^0-9+]/g, '') : '';
            const status = msg.status || 'unread';

            return (
              <div key={msg.id} className={`message-card ${status}`}>
                <div className="message-header-row">
                  <div className="message-customer-info">
                    <div className="message-avatar">
                      {(msg.name || 'C').charAt(0).toUpperCase()}
                    </div>
                    <div className="message-meta">
                      <h4>{msg.name || 'Anonymous Customer'}</h4>
                      <p className="message-contact-line">
                        {isEmail ? (
                          <>
                            <Mail size={13} /> {msg.contact}
                          </>
                        ) : (
                          <>
                            <Phone size={13} /> {msg.contact}
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <span className={`message-badge ${status}`}>
                    {status === 'unread' ? '● Unread' : status}
                  </span>
                </div>

                <div className="message-body">{msg.message}</div>

                <div className="message-footer-row">
                  <div className="message-timestamp">
                    <Clock size={13} />
                    {msg.created_at
                      ? new Date(msg.created_at).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })
                      : 'Recently received'}
                  </div>

                  <div className="message-actions">
                    {/* Direct Contact Button */}
                    {isEmail ? (
                      <a
                        href={`mailto:${msg.contact}?subject=YAARANA Cafe: Re: Your Inquiry`}
                        className="btn-message-action call"
                        title="Send reply email"
                      >
                        <Mail size={14} /> Reply Email
                      </a>
                    ) : cleanPhone ? (
                      <a
                        href={`tel:${cleanPhone}`}
                        className="btn-message-action call"
                        title="Call customer directly in Phone app"
                      >
                        <Phone size={14} /> Call Customer
                      </a>
                    ) : null}

                    {/* Status Toggle Buttons */}
                    {status === 'unread' && (
                      <button
                        type="button"
                        className="btn-message-action"
                        disabled={actionInProgress === msg.id}
                        onClick={() => handleUpdateStatus(msg.id, 'read')}
                      >
                        Mark Read
                      </button>
                    )}

                    {status !== 'resolved' ? (
                      <button
                        type="button"
                        className="btn-message-action resolve"
                        disabled={actionInProgress === msg.id}
                        onClick={() => handleUpdateStatus(msg.id, 'resolved')}
                      >
                        <CheckCircle size={14} /> Mark Resolved
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-message-action"
                        disabled={actionInProgress === msg.id}
                        onClick={() => handleUpdateStatus(msg.id, 'unread')}
                      >
                        Mark Unread
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn-message-action delete"
                      disabled={actionInProgress === msg.id}
                      onClick={() => handleDelete(msg.id)}
                      title="Delete inquiry"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
