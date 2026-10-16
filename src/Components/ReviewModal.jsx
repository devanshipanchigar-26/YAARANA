import React, { useState, useEffect, useRef } from 'react';
import { X, Star, Upload, Trash2, CheckCircle2, AlertCircle, Camera, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import './ReviewModal.css';

const RATING_LABELS = {
  1: '1 ★ - Needs Improvement',
  2: '2 ★ - Fair',
  3: '3 ★ - Good Experience',
  4: '4 ★ - Very Good!',
  5: '5 ★ - Outstanding! Loved It!',
};

export default function ReviewModal({ isOpen, onClose, order, onReviewSubmitted }) {
  const { user, profile } = useAuth();
  const fileInputRef = useRef(null);

  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [customerName, setCustomerName] = useState('');
  
  // Photo upload states
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState(null);

  // Status & existing review
  const [existingReviewId, setExistingReviewId] = useState(null);
  const [existingReviewStatus, setExistingReviewStatus] = useState(null);
  const [loadingExisting, setLoadingExisting] = useState(false);

  // Submitting states
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Order display strings
  const orderRefId = String(order?.id || order?.orderId || '').trim();
  const orderDisplayLabel =
    order?.order_number ||
    (orderRefId.startsWith('#') ? orderRefId : orderRefId ? `#YRN-${orderRefId}` : '#YRN-ORDER');
  const tableDisplay = order?.table_no || order?.tableNo ? `Table ${order.table_no || order.tableNo}` : '';

  // Initialize or fetch existing review
  useEffect(() => {
    if (!isOpen || !orderRefId) return;

    // Reset states
    setErrorMsg('');
    setIsSuccess(false);
    setPhotoFile(null);
    setPhotoPreview(null);
    setExistingImageUrl(null);
    setExistingReviewId(null);
    setExistingReviewStatus(null);

    // Initial name from user or order
    const bestName =
      profile?.name ||
      user?.user_metadata?.name ||
      user?.user_metadata?.full_name ||
      order?.customer_name ||
      order?.customerName ||
      '';
    setCustomerName(bestName || 'Valued Customer');

    const checkExistingReview = async () => {
      setLoadingExisting(true);
      try {
        let query = supabase
          .from('reviews')
          .select('*')
          .eq('order_id', orderRefId);

        if (user?.id) {
          query = query.eq('user_id', user.id);
        }

        const { data, error } = await query.maybeSingle();

        if (data && !error) {
          setExistingReviewId(data.id);
          setExistingReviewStatus(data.status);
          setRating(data.rating || 5);
          setComment(data.comment || data.review_text || '');
          if (data.customer_name) setCustomerName(data.customer_name);
          if (data.image_url) {
            setExistingImageUrl(data.image_url);
            setPhotoPreview(data.image_url);
          }
        }
      } catch (err) {
        console.warn('Could not check existing review:', err);
      } finally {
        setLoadingExisting(false);
      }
    };

    checkExistingReview();
  }, [isOpen, orderRefId, user, profile, order]);

  if (!isOpen) return null;

  // Handle file picker
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (JPEG, PNG, or WebP).');
      return;
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Photo size must be less than 5MB.');
      return;
    }

    setErrorMsg('');
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setPhotoPreview(event.target?.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setExistingImageUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const trimmedComment = comment.trim();
    if (trimmedComment.length < 5) {
      setErrorMsg('Please write a review with at least 5 characters.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      let finalImageUrl = existingImageUrl;

      // 1. If customer uploaded a new photo, upload to Supabase Storage
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop() || 'jpg';
        const sanitizedOrderId = orderRefId.replace(/[^a-zA-Z0-9_-]/g, '');
        const fileName = `${user?.id || 'guest'}/${sanitizedOrderId}_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('review-photos')
          .upload(fileName, photoFile, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) {
          // If storage bucket is missing or restricted, log clearly
          console.warn('Supabase storage upload failed:', uploadError.message);
          throw new Error(`Photo upload failed: ${uploadError.message}. Make sure 'review-photos' bucket exists.`);
        }

        const { data: publicData } = supabase.storage
          .from('review-photos')
          .getPublicUrl(fileName);

        finalImageUrl = publicData?.publicUrl || null;
      }

      // 2. Prepare database payload
      const reviewPayload = {
        user_id: user?.id || null,
        order_id: orderRefId,
        customer_name: customerName.trim() || 'Valued Customer',
        rating: Number(rating),
        comment: trimmedComment,
        image_url: finalImageUrl,
        status: 'pending',
        is_featured_in_gallery: false,
        updated_at: new Date().toISOString(),
      };

      if (existingReviewId) {
        // Update existing review
        const { data: updatedData, error: updateError } = await supabase
          .from('reviews')
          .update(reviewPayload)
          .eq('id', existingReviewId)
          .select()
          .single();

        if (updateError) throw updateError;
        if (onReviewSubmitted) onReviewSubmitted(updatedData);
      } else {
        // Insert new review
        const { data: insertedData, error: insertError } = await supabase
          .from('reviews')
          .insert([reviewPayload])
          .select()
          .single();

        if (insertError) throw insertError;
        if (onReviewSubmitted) onReviewSubmitted(insertedData);
      }

      setIsSuccess(true);
    } catch (err) {
      console.error('Error submitting review:', err);
      if (err.message && err.message.includes('schema cache')) {
        setErrorMsg("Database table needs update: Please run the SQL migration snippet in your Supabase SQL Editor to add the missing columns.");
      } else {
        setErrorMsg(err.message || 'Failed to submit review. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="review-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="review-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="review-modal-header">
          <div>
            <span className="review-header-badge">⭐ YAARANA Memories</span>
            <h2 className="review-modal-title">Rate Your Experience</h2>
            <p className="review-order-subtitle">
              {orderDisplayLabel} {tableDisplay ? `• ${tableDisplay}` : ''}
            </p>
          </div>
          <button
            type="button"
            className="review-close-btn"
            onClick={onClose}
            aria-label="Close review modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        {isSuccess ? (
          <div className="review-success-view">
            <span className="review-success-icon">🎉</span>
            <h3 className="review-success-title">THANK YOU!</h3>
            <p className="review-success-desc">
              Your review and rating have been received! Our team will review your feedback, and your
              photo may be featured on our homepage gallery.
            </p>
            {photoPreview && (
              <div className="review-gallery-note">
                📸 Your photo has been uploaded for gallery consideration!
              </div>
            )}
            <button
              type="button"
              className="review-submit-btn"
              onClick={onClose}
              style={{ width: '100%', marginTop: '10px' }}
            >
              Done & Continue
            </button>
          </div>
        ) : (
          <form className="review-modal-body" onSubmit={handleSubmit}>
            {/* Existing Review Status Banner */}
            {existingReviewId && (
              <div className="review-existing-badge">
                <span>
                  📝 You previously submitted a review for this order ({existingReviewStatus?.toUpperCase() || 'PENDING'}).
                </span>
              </div>
            )}

            {/* Error Banner */}
            {errorMsg && (
              <div className="review-alert-box review-alert-error">
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Interactive Star Rating Selector */}
            <div className="rating-selector-group">
              <span className="rating-label-title">How would you rate your visit?</span>
              <div className="stars-row">
                {[1, 2, 3, 4, 5].map((starVal) => {
                  const activeStar = hoverRating || rating;
                  const isFilled = starVal <= activeStar;

                  return (
                    <button
                      key={starVal}
                      type="button"
                      className="star-btn"
                      onClick={() => setRating(starVal)}
                      onMouseEnter={() => setHoverRating(starVal)}
                      onMouseLeave={() => setHoverRating(0)}
                      aria-label={`Rate ${starVal} stars`}
                    >
                      <Star
                        className={`star-icon ${isFilled ? 'filled' : 'empty'}`}
                      />
                    </button>
                  );
                })}
              </div>
              <span className="rating-feedback-badge">
                {RATING_LABELS[hoverRating || rating]}
              </span>
            </div>

            {/* Customer Display Name */}
            <div className="review-field-group">
              <label className="review-field-label">Your Name</label>
              <input
                type="text"
                className="review-field-input"
                placeholder="Enter your name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                maxLength={60}
                required
              />
            </div>

            {/* Written Review */}
            <div className="review-field-group">
              <label className="review-field-label">Written Feedback</label>
              <textarea
                className="review-field-textarea"
                placeholder="Share your thoughts about the taste, service, or ambiance..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={500}
                required
              />
              <span className="char-counter">{comment.length} / 500 characters</span>
            </div>

            {/* Photo Upload Section */}
            <div className="photo-upload-section">
              <label className="review-field-label">
                Upload Photo <span style={{ color: '#8C786E', fontWeight: 'normal' }}>(Optional — for Homepage Gallery)</span>
              </label>

              {photoPreview ? (
                <div className="photo-preview-wrap">
                  <img src={photoPreview} alt="Review preview" className="photo-preview-img" />
                  <button
                    type="button"
                    className="photo-remove-btn"
                    onClick={handleRemovePhoto}
                    title="Remove photo"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ) : (
                <div
                  className="photo-dropzone"
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                >
                  <span className="photo-dropzone-icon">📷</span>
                  <p className="photo-dropzone-title">Click to add a food or cafe photo</p>
                  <p className="photo-dropzone-hint">Supports JPEG, PNG, WebP up to 5MB</p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp"
                style={{ display: 'none' }}
                onChange={handlePhotoSelect}
              />
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              className="review-submit-btn"
              disabled={submitting || loadingExisting}
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="spin-icon" /> Submitting Review...
                </>
              ) : existingReviewId ? (
                'Update Review'
              ) : (
                'Submit Review'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
