import React, { useState, useEffect } from 'react';
import {
  Star,
  CheckCircle,
  XCircle,
  Trash2,
  Image as ImageIcon,
  Clock,
  Eye,
  Filter,
  Search,
  Sparkles,
  ExternalLink,
  X,
  Camera,
  ThumbsUp,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import './MenuManagementPage.css';

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'approved' | 'rejected' | 'gallery'
  const [filterRating, setFilterRating] = useState('all'); // 'all' | '5' | '4' | '3' | '2' | '1'
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          users (
            name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    setUpdatingId(id);
    try {
      const updatePayload = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      // If rejected, remove from gallery automatically
      if (newStatus === 'rejected') {
        updatePayload.is_featured_in_gallery = false;
      }

      const { error } = await supabase
        .from('reviews')
        .update(updatePayload)
        .eq('id', id);

      if (error) throw error;

      setReviews((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...updatePayload } : r))
      );
    } catch (error) {
      console.error('Error updating review status:', error.message);
      alert('Failed to update status: ' + error.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleGallery = async (review) => {
    setUpdatingId(review.id);
    const nextVal = !review.is_featured_in_gallery;
    try {
      const updatePayload = {
        is_featured_in_gallery: nextVal,
        // If featuring in gallery, also ensure status is approved
        status: nextVal ? 'approved' : review.status,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('reviews')
        .update(updatePayload)
        .eq('id', review.id);

      if (error) throw error;

      setReviews((prev) =>
        prev.map((r) => (r.id === review.id ? { ...r, ...updatePayload } : r))
      );
    } catch (error) {
      console.error('Error updating gallery status:', error.message);
      alert('Failed to update gallery status: ' + error.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteReview = async (id) => {
    if (!window.confirm('Are you sure you want to delete this review permanently?')) return;
    try {
      const { error } = await supabase.from('reviews').delete().eq('id', id);

      if (error) throw error;
      setReviews(reviews.filter((r) => r.id !== id));
    } catch (error) {
      console.error('Error deleting review:', error.message);
      alert('Failed to delete review: ' + error.message);
    }
  };

  // Stats calculations
  const totalReviews = reviews.length;
  const pendingCount = reviews.filter((r) => (r.status || 'pending').toLowerCase() === 'pending').length;
  const approvedCount = reviews.filter((r) => (r.status || '').toLowerCase() === 'approved').length;
  const rejectedCount = reviews.filter((r) => (r.status || '').toLowerCase() === 'rejected').length;
  const galleryCount = reviews.filter((r) => r.is_featured_in_gallery).length;

  const averageRating =
    totalReviews > 0
      ? (reviews.reduce((acc, r) => acc + (parseFloat(r.rating) || 0), 0) / totalReviews).toFixed(1)
      : '0.0';

  // Filter reviews
  const filteredReviews = reviews.filter((review) => {
    // 1. Status Filter
    const reviewStatus = (review.status || 'pending').toLowerCase();
    if (statusFilter === 'pending' && reviewStatus !== 'pending') return false;
    if (statusFilter === 'approved' && reviewStatus !== 'approved') return false;
    if (statusFilter === 'rejected' && reviewStatus !== 'rejected') return false;
    if (statusFilter === 'gallery' && !review.is_featured_in_gallery) return false;

    // 2. Rating Filter
    if (filterRating !== 'all' && Math.round(review.rating) !== parseInt(filterRating, 10)) {
      return false;
    }

    // 3. Search Term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const customerName = (review.users?.name || review.customer_name || '').toLowerCase();
      const email = (review.users?.email || '').toLowerCase();
      const commentText = (review.comment || review.review_text || '').toLowerCase();
      const orderRef = (review.order_id || '').toLowerCase();

      return (
        customerName.includes(term) ||
        email.includes(term) ||
        commentText.includes(term) ||
        orderRef.includes(term)
      );
    }

    return true;
  });

  return (
    <div className="menu-management-page">
      {/* Page Title & Main Header */}
      <div className="page-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 className="admin-page-title" style={{ fontFamily: "'Luckiest Guy', cursive", color: '#3D271D', fontSize: '2.1rem', margin: 0 }}>
            ⭐ Reviews & Photo Moderation
          </h2>
          <p style={{ margin: '4px 0 0', color: '#7D6A60', fontSize: '0.9rem' }}>
            Moderate customer feedback and curate guest photos for the Homepage Gallery.
          </p>
        </div>

        {/* Rating Filter Tabs */}
        <div style={{ display: 'flex', background: '#FDFBFA', padding: '4px', borderRadius: '14px', border: '1px solid #EFE9E1', flexWrap: 'wrap', gap: '2px' }}>
          {['all', '5', '4', '3', '2', '1'].map((rate) => (
            <button
              key={rate}
              onClick={() => setFilterRating(rate)}
              style={{
                padding: '6px 12px',
                borderRadius: '10px',
                border: 'none',
                background: filterRating === rate ? '#311E18' : 'transparent',
                color: filterRating === rate ? '#FFD000' : '#6B554B',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '0.82rem',
                transition: 'all 0.15s ease'
              }}
            >
              {rate === 'all' ? 'All Stars' : `${rate} ⭐`}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', margin: '20px 0' }}>
        <div style={{ background: '#FDFBFA', border: '1px solid #EFE9E1', borderRadius: '18px', padding: '16px 20px', boxShadow: '0 4px 12px rgba(61, 39, 29, 0.03)' }}>
          <p style={{ margin: '0 0 6px 0', fontSize: '0.78rem', color: '#7D6A60', fontWeight: '800', letterSpacing: '0.04em' }}>
            AVERAGE RATING
          </p>
          <h3 style={{ margin: 0, fontSize: '1.75rem', color: '#F59E0B', fontFamily: "'Luckiest Guy', cursive" }}>
            {averageRating} <span style={{ fontSize: '1rem', color: '#9CA3AF' }}>/ 5.0</span>
          </h3>
        </div>

        <div style={{ background: '#FDFBFA', border: '1px solid #EFE9E1', borderRadius: '18px', padding: '16px 20px', boxShadow: '0 4px 12px rgba(61, 39, 29, 0.03)' }}>
          <p style={{ margin: '0 0 6px 0', fontSize: '0.78rem', color: '#7D6A60', fontWeight: '800', letterSpacing: '0.04em' }}>
            PENDING APPROVAL
          </p>
          <h3 style={{ margin: 0, fontSize: '1.75rem', color: pendingCount > 0 ? '#DC2626' : '#15803D', fontFamily: "'Luckiest Guy', cursive" }}>
            {pendingCount} {pendingCount > 0 ? '⚠️' : '✓'}
          </h3>
        </div>

        <div style={{ background: '#FDFBFA', border: '1px solid #EFE9E1', borderRadius: '18px', padding: '16px 20px', boxShadow: '0 4px 12px rgba(61, 39, 29, 0.03)' }}>
          <p style={{ margin: '0 0 6px 0', fontSize: '0.78rem', color: '#7D6A60', fontWeight: '800', letterSpacing: '0.04em' }}>
            HOMEPAGE GALLERY
          </p>
          <h3 style={{ margin: 0, fontSize: '1.75rem', color: '#2563EB', fontFamily: "'Luckiest Guy', cursive" }}>
            {galleryCount} 📸
          </h3>
        </div>

        <div style={{ background: '#FDFBFA', border: '1px solid #EFE9E1', borderRadius: '18px', padding: '16px 20px', boxShadow: '0 4px 12px rgba(61, 39, 29, 0.03)' }}>
          <p style={{ margin: '0 0 6px 0', fontSize: '0.78rem', color: '#7D6A60', fontWeight: '800', letterSpacing: '0.04em' }}>
            TOTAL REVIEWS
          </p>
          <h3 style={{ margin: 0, fontSize: '1.75rem', color: '#3D271D', fontFamily: "'Luckiest Guy', cursive" }}>
            {totalReviews}
          </h3>
        </div>
      </div>

      {/* Moderation Status Tabs & Search Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderBottom: '2px solid #EFE9E1', paddingBottom: '10px' }}>
          {[
            { id: 'all', label: `All (${totalReviews})` },
            { id: 'pending', label: `⏳ Pending Approval (${pendingCount})`, highlight: pendingCount > 0 },
            { id: 'approved', label: `✓ Approved (${approvedCount})` },
            { id: 'rejected', label: `❌ Rejected (${rejectedCount})` },
            { id: 'gallery', label: `📸 In Gallery (${galleryCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '12px',
                border: 'none',
                background: statusFilter === tab.id ? '#311E18' : tab.highlight ? '#FFF3D6' : '#F7F3EE',
                color: statusFilter === tab.id ? '#FFD000' : tab.highlight ? '#B25E00' : '#5C473C',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '0.88rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: '#FDFBFA', padding: '12px 18px', borderRadius: '16px', border: '1px solid #EFE9E1' }}>
          <Search size={18} color="#8C786E" />
          <input
            type="text"
            placeholder="Search by customer name, order #, or keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '0.92rem', color: '#3D271D', outline: 'none' }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Reviews Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {loading ? (
          <div className="no-history-box"><p>Loading customer reviews...</p></div>
        ) : filteredReviews.length === 0 ? (
          <div className="no-history-box">
            <p>No reviews found matching the selected filters.</p>
          </div>
        ) : (
          filteredReviews.map((review) => {
            const ratingNum = parseInt(review.rating, 10) || 5;
            const customerName = review.customer_name || review.users?.name || 'Valued Guest';
            const customerEmail = review.users?.email || '';
            const reviewDate = review.created_at
              ? new Date(review.created_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Recent';

            const status = (review.status || 'pending').toLowerCase();
            const isGallery = Boolean(review.is_featured_in_gallery);
            const isUpdating = updatingId === review.id;

            return (
              <div
                key={review.id}
                style={{
                  background: '#FFFFFF',
                  border: status === 'pending' ? '2px solid #FFD000' : '1px solid #EFE9E1',
                  borderRadius: '20px',
                  padding: '20px',
                  boxShadow: '0 6px 18px rgba(61, 39, 29, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  transition: 'transform 0.15s ease',
                  position: 'relative'
                }}
              >
                {/* Top Row: Customer Info, Status Badges & Date */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '1.1rem', color: '#3D271D' }}>{customerName}</strong>
                      {customerEmail && (
                        <span style={{ fontSize: '0.8rem', color: '#7E6B62' }}>({customerEmail})</span>
                      )}

                      {/* Status Badge */}
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: '800',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          textTransform: 'uppercase',
                          background:
                            status === 'approved'
                              ? '#DCFCE7'
                              : status === 'rejected'
                              ? '#FEE2E2'
                              : '#FFF3D6',
                          color:
                            status === 'approved'
                              ? '#15803D'
                              : status === 'rejected'
                              ? '#991B1B'
                              : '#B25E00',
                        }}
                      >
                        {status === 'approved' ? '✓ Approved' : status === 'rejected' ? '❌ Rejected' : '⏳ Pending Approval'}
                      </span>

                      {/* Gallery Badge */}
                      {isGallery && (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: '800',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            background: '#EFF6FF',
                            color: '#1E40AF',
                            border: '1px solid #BFDBFE'
                          }}
                        >
                          📸 In Homepage Gallery
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', fontSize: '0.82rem', color: '#8C786E' }}>
                      <div style={{ display: 'flex', gap: '2px', color: '#F59E0B' }}>
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={16}
                            fill={i < ratingNum ? '#F59E0B' : '#E5E7EB'}
                            stroke={i < ratingNum ? '#D97706' : '#D1D5DB'}
                          />
                        ))}
                      </div>
                      <span>•</span>
                      <span>{reviewDate}</span>
                      {review.order_id && (
                        <>
                          <span>•</span>
                          <span style={{ background: '#F4EFEA', padding: '2px 8px', borderRadius: '6px', fontWeight: 'bold', color: '#5C473C' }}>
                            Order: {review.order_id}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={() => handleDeleteReview(review.id)}
                    title="Delete review"
                    style={{
                      background: '#FDF2F2',
                      border: '1px solid #FCA5A5',
                      color: '#DC2626',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                    }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>

                {/* Middle Row: Review Text & Photo */}
                <div style={{ display: 'flex', gap: '18px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  {review.image_url && (
                    <div
                      style={{
                        position: 'relative',
                        width: '110px',
                        height: '110px',
                        borderRadius: '14px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        border: '2px solid #EFE9E1',
                        flexShrink: 0,
                        boxShadow: '0 4px 10px rgba(0,0,0,0.06)'
                      }}
                      onClick={() => setLightboxImage(review.image_url)}
                      title="Click to zoom photo"
                    >
                      <img
                        src={review.image_url}
                        alt="Customer upload"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(0,0,0,0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: 0,
                          transition: 'opacity 0.2s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                      >
                        <Eye size={22} color="white" />
                      </div>
                    </div>
                  )}

                  <p
                    style={{
                      margin: 0,
                      color: '#4B3629',
                      fontSize: '0.96rem',
                      lineHeight: '1.6',
                      flex: 1,
                      minWidth: '240px',
                      fontStyle: 'italic',
                      background: '#FAF7F2',
                      padding: '14px 18px',
                      borderRadius: '14px',
                      borderLeft: '4px solid #FFD000'
                    }}
                  >
                    "{review.comment || review.review_text || 'Great dining experience at YAARANA!'}"
                  </p>
                </div>

                {/* Bottom Row: Admin Moderation Action Bar */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid #F5EFEB',
                    paddingTop: '12px',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {/* Approve Button */}
                    {status !== 'approved' && (
                      <button
                        onClick={() => handleUpdateStatus(review.id, 'approved')}
                        disabled={isUpdating}
                        style={{
                          backgroundColor: '#15803D',
                          color: '#FFFFFF',
                          border: 'none',
                          padding: '7px 16px',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          fontSize: '0.82rem',
                          fontWeight: 'bold',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <CheckCircle size={15} /> Approve Review
                      </button>
                    )}

                    {/* Reject Button */}
                    {status !== 'rejected' && (
                      <button
                        onClick={() => handleUpdateStatus(review.id, 'rejected')}
                        disabled={isUpdating}
                        style={{
                          backgroundColor: '#F3F4F6',
                          color: '#DC2626',
                          border: '1px solid #E5E7EB',
                          padding: '7px 16px',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          fontSize: '0.82rem',
                          fontWeight: 'bold',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <XCircle size={15} /> Reject
                      </button>
                    )}
                  </div>

                  {/* Gallery Toggle Button (only if image exists) */}
                  {review.image_url && (
                    <button
                      onClick={() => handleToggleGallery(review)}
                      disabled={isUpdating}
                      style={{
                        backgroundColor: isGallery ? '#311E18' : '#EFF6FF',
                        color: isGallery ? '#FFD000' : '#1D4ED8',
                        border: isGallery ? 'none' : '1.5px solid #93C5FD',
                        padding: '7px 16px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontSize: '0.82rem',
                        fontWeight: 'bold',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Camera size={15} />
                      {isGallery ? '✓ Featured in Gallery (Click to Remove)' : '+ Feature Photo in Gallery'}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Lightbox Modal for Full-Resolution Image Viewing */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            backdropFilter: 'blur(5px)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              background: '#000',
              borderRadius: '18px',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
            }}
          >
            <button
              onClick={() => setLightboxImage(null)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'rgba(0,0,0,0.7)',
                color: '#FFF',
                border: 'none',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={20} />
            </button>
            <img
              src={lightboxImage}
              alt="Enlarged review photo"
              style={{ maxWidth: '100%', maxHeight: '85vh', display: 'block', objectFit: 'contain' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}