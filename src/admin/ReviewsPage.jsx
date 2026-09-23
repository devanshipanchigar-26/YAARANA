import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './MenuManagementPage.css';

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

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

  const handleDeleteReview = async (id) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setReviews(reviews.filter(r => r.id !== id));
    } catch (error) {
      console.error('Error deleting review:', error.message);
      alert('Failed to delete review.');
    }
  };

  // Calculate rating stats
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0 
    ? (reviews.reduce((acc, r) => acc + (parseFloat(r.rating) || 0), 0) / totalReviews).toFixed(1)
    : '0.0';

  const fiveStarCount = reviews.filter(r => Math.round(r.rating) === 5).length;
  const fourStarCount = reviews.filter(r => Math.round(r.rating) === 4).length;
  const threeStarCount = reviews.filter(r => Math.round(r.rating) === 3).length;
  const lowStarCount = totalReviews - fiveStarCount - fourStarCount - threeStarCount;

  // Filter reviews by rating and search term
  const filteredReviews = reviews.filter(review => {
    const matchesRating = filterRating === 'all' || Math.round(review.rating) === parseInt(filterRating);
    const customerName = (review.users?.name || review.customer_name || 'Anonymous Guest').toLowerCase();
    const commentText = (review.comment || review.review_text || '').toLowerCase();
    const term = searchTerm.toLowerCase();
    const matchesSearch = customerName.includes(term) || commentText.includes(term) || term === '';

    return matchesRating && matchesSearch;
  });

  return (
    <div className="menu-management-page">
      <div className="page-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <h2 className="admin-page-title" style={{ fontFamily: "'Luckiest Guy', cursive", color: '#3D271D', fontSize: '2rem', margin: 0 }}>
          ⭐ Customer Reviews & Feedback
        </h2>

        {/* Rating Filter Tabs */}
        <div style={{ display: 'flex', background: '#FDFBFA', padding: '4px', borderRadius: '12px', border: '1px solid #EFE9E1', flexWrap: 'wrap' }}>
          {['all', '5', '4', '3', '2', '1'].map((rate) => (
            <button
              key={rate}
              onClick={() => setFilterRating(rate)}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                background: filterRating === rate ? '#311E18' : 'transparent',
                color: filterRating === rate ? '#FFD000' : '#6B554B',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '0.8rem',
              }}
            >
              {rate === 'all' ? 'All' : `${rate} ⭐`}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', margin: '20px 0' }}>
        <div style={{ background: '#FDFBFA', border: '1px solid #EFE9E1', borderRadius: '16px', padding: '18px', boxShadow: '0 4px 12px rgba(61, 39, 29, 0.03)' }}>
          <p style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: '#6B554B', fontWeight: 'bold' }}>AVERAGE RATING</p>
          <h3 style={{ margin: 0, fontSize: '1.8rem', color: '#f39c12', fontFamily: "'Luckiest Guy', cursive" }}>{averageRating} / 5.0</h3>
        </div>
        <div style={{ background: '#FDFBFA', border: '1px solid #EFE9E1', borderRadius: '16px', padding: '18px', boxShadow: '0 4px 12px rgba(61, 39, 29, 0.03)' }}>
          <p style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: '#6B554B', fontWeight: 'bold' }}>TOTAL REVIEWS</p>
          <h3 style={{ margin: 0, fontSize: '1.8rem', color: '#3D271D', fontFamily: "'Luckiest Guy', cursive" }}>{totalReviews}</h3>
        </div>
        <div style={{ background: '#FDFBFA', border: '1px solid #EFE9E1', borderRadius: '16px', padding: '18px', boxShadow: '0 4px 12px rgba(61, 39, 29, 0.03)' }}>
          <p style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: '#6B554B', fontWeight: 'bold' }}>5-STAR FEEDBACK</p>
          <h3 style={{ margin: 0, fontSize: '1.8rem', color: '#27ae60', fontFamily: "'Luckiest Guy', cursive" }}>{fiveStarCount}</h3>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: '#FDFBFA', padding: '14px 20px', borderRadius: '16px', border: '1px solid #EFE9E1', marginBottom: '20px' }}>
        <input 
          type="text"
          placeholder="🔍 Search reviews by customer name or keyword..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: '1px solid #EFE9E1', background: '#F9F6F0', fontSize: '0.9rem', color: '#3D271D', outline: 'none' }}
        />
      </div>

      {/* Reviews Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {loading ? (
          <div className="no-history-box"><p>Loading customer reviews...</p></div>
        ) : filteredReviews.length === 0 ? (
          <div className="no-history-box">
            <p>No reviews found matching your search.</p>
          </div>
        ) : (
          filteredReviews.map((review) => {
            const ratingNum = parseInt(review.rating) || 5;
            const stars = '⭐'.repeat(ratingNum);
            const customerName = review.users?.name || review.customer_name || 'Anonymous Guest';
            const reviewDate = review.created_at ? new Date(review.created_at).toLocaleDateString() : 'Recent';

            return (
              <div 
                key={review.id} 
                style={{ background: '#FDFBFA', border: '1px solid #EFE9E1', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 12px rgba(61, 39, 29, 0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '1.05rem', color: '#3D271D' }}>{customerName}</strong>
                    <span style={{ fontSize: '0.9rem' }}>{stars}</span>
                    <span style={{ fontSize: '0.75rem', color: '#888' }}>{reviewDate}</span>
                  </div>
                  <p style={{ margin: '0', color: '#6B554B', fontSize: '0.95rem', lineHeight: '1.5' }}>
                    "{review.comment || review.review_text || 'Great experience at Yaarana Café!'}"
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => alert('Reply feature coming soon!')}
                    style={{ backgroundColor: '#FFD000', color: '#311E18', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}
                  >
                    Reply
                  </button>
                  <button 
                    onClick={() => handleDeleteReview(review.id)}
                    style={{ backgroundColor: '#e74c3c', color: '#FFF', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}