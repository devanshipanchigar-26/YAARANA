import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Upload, 
  Trash2, 
  Edit3, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw,
  Image as ImageIcon,
  Check
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import './SpecialsManagementPage.css';

export default function SpecialsManagementPage() {
  const [specials, setSpecials] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states
  const [editingId, setEditingId] = useState(null);
  const [selectedMenuItemId, setSelectedMenuItemId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [badgeText, setBadgeText] = useState('Chef Special');
  const [displayOrder, setDisplayOrder] = useState(1);
  const [isVisible, setIsVisible] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);

  // Image Upload state
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [existingImageUrl, setExistingImageUrl] = useState('');

  // Delete Confirmation Modal state
  const [specialToDelete, setSpecialToDelete] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // 1. Fetch menu items for the linking dropdown
      const { data: menuData, error: menuErr } = await supabase
        .from('menu_items')
        .select('*')
        .order('name', { ascending: true });

      if (menuErr) throw menuErr;
      setMenuItems(menuData || []);

      // 2. Fetch specials with linked menu item info
      const { data: specialsData, error: specialsErr } = await supabase
        .from('specials')
        .select(`
          *,
          menu_items (
            id,
            name,
            price,
            is_available,
            emoji
          )
        `)
        .order('display_order', { ascending: true });

      if (specialsErr) {
        // Table might not be migrated yet
        if (specialsErr.code === 'PGRST205' || specialsErr.message?.includes('not find the table')) {
          setErrorMsg(
            'The "specials" table was not found in Supabase. Please execute the provided "supabase_specials_migration.sql" script in your Supabase Dashboard SQL Editor.'
          );
        } else {
          throw specialsErr;
        }
      } else {
        setSpecials(specialsData || []);
      }
    } catch (err) {
      console.error('Error fetching specials data:', err);
      setErrorMsg(err.message || 'Failed to load specials.');
    } finally {
      setLoading(false);
    }
  };

  // When a user selects a menu item from the dropdown, autofill details
  const handleMenuItemChange = (e) => {
    const val = e.target.value;
    setSelectedMenuItemId(val);

    if (val) {
      const selectedItem = menuItems.find((m) => String(m.id) === String(val));
      if (selectedItem) {
        if (!title || editingId === null) {
          setTitle(selectedItem.name);
        }
        if (!description || editingId === null) {
          setDescription(selectedItem.description || '');
        }
        if (!previewUrl && !existingImageUrl && selectedItem.image_url) {
          setExistingImageUrl(selectedItem.image_url);
        }
      }
    }
  };

  // Image Selection Handler
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file (PNG, JPG, WebP).');
        return;
      }
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleClearImage = () => {
    setImageFile(null);
    setPreviewUrl('');
    setExistingImageUrl('');
  };

  // Reset form
  const resetForm = () => {
    setEditingId(null);
    setSelectedMenuItemId('');
    setTitle('');
    setDescription('');
    setBadgeText('Chef Special');
    setDisplayOrder(specials.length + 1);
    setIsVisible(true);
    setIsAvailable(true);
    setImageFile(null);
    setPreviewUrl('');
    setExistingImageUrl('');
  };

  // Submit Add / Edit Special
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please enter a Title for this special.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      let finalImageUrl = existingImageUrl;

      // Upload image to Supabase Storage if a new file was chosen
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop() || 'jpg';
        const sanitizedTitle = title.trim().replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
        const fileName = `special_${Date.now()}_${sanitizedTitle}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('specials')
          .upload(fileName, imageFile, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) {
          console.warn('Image storage upload failed:', uploadError.message);
          // If bucket doesn't exist, provide clear message
          if (uploadError.message?.includes('not found') || uploadError.error === 'Bucket not found') {
            throw new Error(
              'The "specials" storage bucket is not created yet. Please execute the "supabase_specials_migration.sql" script in Supabase Dashboard.'
            );
          }
          throw uploadError;
        }

        const { data: publicData } = supabase.storage
          .from('specials')
          .getPublicUrl(fileName);

        finalImageUrl = publicData?.publicUrl || '';
      }

      const payload = {
        title: title.trim(),
        description: description.trim(),
        badge_text: badgeText.trim() || null,
        display_order: parseInt(displayOrder, 10) || 0,
        is_visible: Boolean(isVisible),
        is_available: Boolean(isAvailable),
        image_url: finalImageUrl || null,
        menu_item_id: selectedMenuItemId ? parseInt(selectedMenuItemId, 10) : null,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        // UPDATE existing special
        const { error: updateErr } = await supabase
          .from('specials')
          .update(payload)
          .eq('id', editingId);

        if (updateErr) throw updateErr;
        setSuccessMsg(`Special "${title}" updated successfully!`);
      } else {
        // INSERT new special
        const { error: insertErr } = await supabase
          .from('specials')
          .insert([payload]);

        if (insertErr) throw insertErr;
        setSuccessMsg(`Special "${title}" added to the menu!`);
      }

      resetForm();
      await fetchInitialData();
    } catch (err) {
      console.error('Error saving special:', err);
      setErrorMsg(err.message || 'Failed to save special.');
    } finally {
      setSaving(false);
    }
  };

  // Begin Edit
  const handleEditClick = (special) => {
    setEditingId(special.id);
    setSelectedMenuItemId(special.menu_item_id ? String(special.menu_item_id) : '');
    setTitle(special.title || '');
    setDescription(special.description || '');
    setBadgeText(special.badge_text || '');
    setDisplayOrder(special.display_order ?? 0);
    setIsVisible(Boolean(special.is_visible));
    setIsAvailable(Boolean(special.is_available));
    setExistingImageUrl(special.image_url || '');
    setPreviewUrl('');
    setImageFile(null);

    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  // Instant Visibility Toggle
  const handleToggleVisibility = async (special) => {
    const nextVal = !special.is_visible;
    // Optimistic UI update
    setSpecials((prev) =>
      prev.map((s) => (s.id === special.id ? { ...s, is_visible: nextVal } : s))
    );

    try {
      const { error } = await supabase
        .from('specials')
        .update({ is_visible: nextVal, updated_at: new Date().toISOString() })
        .eq('id', special.id);

      if (error) {
        throw error;
      }
    } catch (err) {
      console.error('Error toggling visibility:', err);
      alert('Failed to update visibility: ' + err.message);
      // Revert on error
      fetchInitialData();
    }
  };

  // Instant Availability Toggle
  const handleToggleAvailability = async (special) => {
    const nextVal = !special.is_available;
    // Optimistic UI update
    setSpecials((prev) =>
      prev.map((s) => (s.id === special.id ? { ...s, is_available: nextVal } : s))
    );

    try {
      const { error } = await supabase
        .from('specials')
        .update({ is_available: nextVal, updated_at: new Date().toISOString() })
        .eq('id', special.id);

      if (error) {
        throw error;
      }
    } catch (err) {
      console.error('Error toggling availability:', err);
      alert('Failed to update availability: ' + err.message);
      // Revert on error
      fetchInitialData();
    }
  };

  // Delete Confirmation Handler
  const confirmDelete = async () => {
    if (!specialToDelete) return;
    const { id, title: deleteTitle } = specialToDelete;
    setSpecialToDelete(null);

    try {
      const { error } = await supabase
        .from('specials')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSuccessMsg(`Special "${deleteTitle}" was deleted.`);
      setSpecials((prev) => prev.filter((s) => s.id !== id));
      if (editingId === id) resetForm();
    } catch (err) {
      console.error('Error deleting special:', err);
      alert('Failed to delete special: ' + err.message);
    }
  };

  // Selected linked item metadata for authoritative price display
  const selectedMenuItem = menuItems.find(
    (m) => String(m.id) === String(selectedMenuItemId)
  );

  // Stat metrics
  const totalSpecials = specials.length;
  const visibleCount = specials.filter((s) => s.is_visible).length;
  const inStockCount = specials.filter((s) => s.is_available).length;
  const linkedCount = specials.filter((s) => s.menu_item_id).length;

  return (
    <div className="specials-admin-page">
      {/* Header */}
      <div className="specials-admin-header">
        <h2 className="specials-admin-title">🌟 Specials Management</h2>
        <p className="specials-admin-subtitle">
          Manage curated cafe specials, upload high-res promotional imagery, toggle live visibility, and link to existing menu items for authoritative ordering.
        </p>

        {/* Stats Summary Bar */}
        <div className="specials-stats-grid">
          <div className="specials-stat-card">
            <div className="specials-stat-icon total">🌟</div>
            <div className="specials-stat-content">
              <h4>Total Specials</h4>
              <p className="stat-number">{totalSpecials}</p>
            </div>
          </div>
          <div className="specials-stat-card">
            <div className="specials-stat-icon visible">👁️</div>
            <div className="specials-stat-content">
              <h4>Live on Website</h4>
              <p className="stat-number">{visibleCount}</p>
            </div>
          </div>
          <div className="specials-stat-card">
            <div className="specials-stat-icon stock">✅</div>
            <div className="specials-stat-content">
              <h4>In Stock</h4>
              <p className="stat-number">{inStockCount}</p>
            </div>
          </div>
          <div className="specials-stat-card">
            <div className="specials-stat-icon linked">🔗</div>
            <div className="specials-stat-content">
              <h4>Linked Menu Items</h4>
              <p className="stat-number">{linkedCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="specials-banner success">
          <span>✅ {successMsg}</span>
          <button 
            type="button" 
            onClick={() => setSuccessMsg('')} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ✕
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="specials-banner error">
          <span>⚠️ {errorMsg}</span>
          <button 
            type="button" 
            onClick={() => setErrorMsg('')} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Add / Edit Form Card */}
      <div className="specials-form-card">
        <h3>
          <Sparkles size={22} color="#FF7A2F" />
          {editingId ? 'Edit Special' : 'Add New Special'}
        </h3>

        <form onSubmit={handleSubmit}>
          <div className="specials-form-grid">
            {/* Link to Menu Item */}
            <div className="form-group">
              <label htmlFor="sp-menu-item">Link to Menu Item (Authoritative Price & Stock)</label>
              <select
                id="sp-menu-item"
                value={selectedMenuItemId}
                onChange={handleMenuItemChange}
              >
                <option value="">-- No link (Promotional Showcase Only) --</option>
                {menuItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.emoji || '🍽️'} {item.name} — ₹{item.price}
                  </option>
                ))}
              </select>
              {selectedMenuItem && (
                <div className="price-hint-badge">
                  <span>Authoritative Price: ₹{selectedMenuItem.price}</span>
                  <span>•</span>
                  <span>Catalog Status: {selectedMenuItem.is_available ? 'In Stock' : 'Out of Stock'}</span>
                </div>
              )}
            </div>

            {/* Special Title */}
            <div className="form-group">
              <label htmlFor="sp-title">Special Display Title *</label>
              <input
                id="sp-title"
                type="text"
                placeholder="e.g. Sizzling Belgian Waffles"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Promo Badge Tag */}
            <div className="form-group">
              <label htmlFor="sp-badge">Badge Tag (e.g. Chef's Special, Trending)</label>
              <input
                id="sp-badge"
                type="text"
                placeholder="Chef Special"
                value={badgeText}
                onChange={(e) => setBadgeText(e.target.value)}
              />
            </div>

            {/* Display Order */}
            <div className="form-group">
              <label htmlFor="sp-order">Carousel Display Order</label>
              <input
                id="sp-order"
                type="number"
                min="0"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="sp-desc">Promotional Description</label>
              <textarea
                id="sp-desc"
                rows="2"
                placeholder="Golden crispy waffles drizzled with warm chocolate ganache and roasted almonds."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Image Upload Box */}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Special Promotional Image (Supabase Storage)</label>
              <div className="image-upload-box">
                {previewUrl || existingImageUrl ? (
                  <div className="upload-preview-wrapper">
                    <img
                      src={previewUrl || existingImageUrl}
                      alt="Special Preview"
                      className="upload-preview-img"
                    />
                    <div className="upload-preview-meta">
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>
                        {imageFile ? imageFile.name : 'Current Image'}
                      </p>
                      <button
                        type="button"
                        className="btn-remove-preview"
                        onClick={handleClearImage}
                      >
                        Remove / Replace
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="upload-placeholder">
                    <Upload size={32} color="#FF7A2F" />
                    <span>Click or drag image file here (PNG, JPG, WebP)</span>
                    <small style={{ color: '#8C786E' }}>Uploads directly to Supabase "specials" storage bucket</small>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </div>
            </div>
          </div>

          {/* Toggles */}
          <div className="specials-toggles-row">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={isVisible}
                onChange={(e) => setIsVisible(e.target.checked)}
              />
              👁️ Visible on customer website
            </label>

            <label className="toggle-label">
              <input
                type="checkbox"
                checked={isAvailable}
                onChange={(e) => setIsAvailable(e.target.checked)}
              />
              ✅ Available in stock for ordering
            </label>
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button
              type="submit"
              className="btn-save-special"
              disabled={saving}
            >
              {saving ? 'Saving...' : editingId ? 'Update Special' : '+ Add Special'}
            </button>

            {editingId && (
              <button
                type="button"
                className="btn-cancel-edit"
                onClick={resetForm}
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Specials List Table */}
      <div className="specials-table-container">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #EFE9E1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontFamily: "'Luckiest Guy', cursive", fontSize: '1.2rem', color: '#3D271D' }}>
            Current Specials ({specials.length})
          </h3>
          <button
            type="button"
            onClick={fetchInitialData}
            title="Refresh specials"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B554B' }}
          >
            <RefreshCw size={18} />
          </button>
        </div>

        {loading ? (
          <div className="specials-empty-state">
            <RefreshCw className="spin" size={32} color="#FF7A2F" />
            <h4>Loading specials...</h4>
          </div>
        ) : specials.length === 0 ? (
          <div className="specials-empty-state">
            <ImageIcon size={44} color="#D1C7BD" />
            <h4>No specials configured yet</h4>
            <p>Add your first special item above to highlight it on the YAARANA homepage carousel.</p>
          </div>
        ) : (
          <table className="specials-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Title & Badge</th>
                <th>Linked Menu Item</th>
                <th>Price</th>
                <th>Order</th>
                <th>Website Visibility</th>
                <th>Stock Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {specials.map((item) => {
                const linked = item.menu_items;
                const effectivePrice = linked?.price ? `₹${linked.price}` : '—';

                return (
                  <tr key={item.id}>
                    <td>
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="table-special-image"
                          onError={(e) => {
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=200&q=80';
                          }}
                        />
                      ) : (
                        <div className="table-special-image" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                          🍽️
                        </div>
                      )}
                    </td>
                    <td>
                      <strong>{item.title}</strong>
                      {item.badge_text && (
                        <div>
                          <span className="table-special-badge">{item.badge_text}</span>
                        </div>
                      )}
                    </td>
                    <td>
                      {linked ? (
                        <span style={{ color: '#2563EB', fontWeight: 600 }}>
                          {linked.emoji || '🍽️'} {linked.name}
                        </span>
                      ) : (
                        <span style={{ color: '#8C786E' }}>Unlinked (Showcase only)</span>
                      )}
                    </td>
                    <td>
                      <strong>{effectivePrice}</strong>
                    </td>
                    <td>
                      <span style={{ background: '#F5F1EB', padding: '4px 10px', borderRadius: '8px', fontWeight: 700 }}>
                        #{item.display_order ?? 0}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`badge-toggle-btn ${item.is_visible ? 'active-blue' : 'inactive-gray'}`}
                        onClick={() => handleToggleVisibility(item)}
                        title="Click to toggle live website visibility"
                      >
                        {item.is_visible ? <Eye size={14} /> : <EyeOff size={14} />}
                        {item.is_visible ? 'Visible' : 'Hidden'}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`badge-toggle-btn ${item.is_available ? 'active-green' : 'inactive-red'}`}
                        onClick={() => handleToggleAvailability(item)}
                        title="Click to toggle order availability"
                      >
                        {item.is_available ? <CheckCircle size={14} /> : <XCircle size={14} />}
                        {item.is_available ? 'In Stock' : 'Out of Stock'}
                      </button>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn-table-action edit"
                          onClick={() => handleEditClick(item)}
                          title="Edit Special"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn-table-action delete"
                          onClick={() => setSpecialToDelete(item)}
                          title="Delete Special"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {specialToDelete && (
        <div className="specials-modal-overlay" onClick={() => setSpecialToDelete(null)}>
          <div className="specials-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>⚠️ Confirm Delete</h3>
            <p>
              Are you sure you want to remove <strong>"{specialToDelete.title}"</strong> from Specials?
              <br />
              <small style={{ color: '#8C786E', display: 'block', marginTop: '6px' }}>
                Note: If this special is linked to a menu item, the menu item itself will NOT be deleted.
              </small>
            </p>
            <div className="specials-modal-actions">
              <button
                type="button"
                className="btn-confirm-delete"
                onClick={confirmDelete}
              >
                Yes, Delete Special
              </button>
              <button
                type="button"
                className="btn-cancel-modal"
                onClick={() => setSpecialToDelete(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
