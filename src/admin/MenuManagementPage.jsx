import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './MenuManagementPage.css';

export default function MenuManagementPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    price: '',
    description: '',
    emoji: '☕'
  });

  useEffect(() => {
    fetchMenuData();
  }, []);

  const fetchMenuData = async () => {
    setLoading(true);
    try {
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (catError) throw catError;
      setCategories(catData || []);

      const { data: menuData, error: menuError } = await supabase
        .from('menu_items')
        .select('*')
        .order('id', { ascending: true });

      if (menuError) throw menuError;
      setMenuItems(menuData || []);
    } catch (error) {
      console.error('Error fetching menu data:', error.message);
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryName = (catId) => {
    const found = categories.find(c => c.id === catId);
    return found ? found.name : 'Unassigned';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.category_id) {
      alert('Please fill in Name, Category, and Price.');
      return;
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from('menu_items')
          .update({
            name: formData.name,
            category_id: parseInt(formData.category_id),
            price: parseFloat(formData.price),
            description: formData.description,
            emoji: formData.emoji
          })
          .eq('id', editingId);

        if (error) throw error;
        alert('Menu item updated successfully!');
      } else {
        const { error } = await supabase
          .from('menu_items')
          .insert([{
            name: formData.name,
            category_id: parseInt(formData.category_id),
            price: parseFloat(formData.price),
            description: formData.description,
            emoji: formData.emoji,
            is_available: true
          }]);

        if (error) throw error;
        alert('New menu item added successfully!');
      }

      setEditingId(null);
      setFormData({ name: '', category_id: '', price: '', description: '', emoji: '☕' });
      fetchMenuData();
    } catch (error) {
      console.error('Error saving item:', error.message);
      alert('Error saving item: ' + error.message);
    }
  };

  const handleEditClick = (item) => {
    setEditingId(item.id);
    setFormData({
      name: item.name,
      category_id: item.category_id || '',
      price: item.price,
      description: item.description || '',
      emoji: item.emoji || '☕'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', category_id: '', price: '', description: '', emoji: '☕' });
  };

  const handleToggleAvailability = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_available: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      setMenuItems(menuItems.map(item => 
        item.id === id ? { ...item, is_available: !currentStatus } : item
      ));
    } catch (error) {
      console.error('Error updating status:', error.message);
    }
  };

  // Filtered menu items based on search query and category dropdown selection
  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategoryFilter === '' || item.category_id.toString() === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="menu-management-page">
      <div className="page-header-row">
        <h2 className="admin-page-title">Menu Management</h2>
      </div>

      {/* Add / Edit Form Card */}
      <div className="add-item-card">
        <h3>{editingId ? '✏️ Edit Menu Item' : '✨ Add New Menu Item'}</h3>
        <form onSubmit={handleSubmit} className="add-item-form">
          <input 
            type="text" 
            placeholder="Item Name" 
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <select 
            value={formData.category_id}
            onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
          >
            <option value="">Select Category</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <input 
            type="number" 
            placeholder="Price (₹)" 
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
          />
          <input 
            type="text" 
            placeholder="Emoji" 
            value={formData.emoji}
            onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
          />
          <input 
            type="text" 
            placeholder="Short Description" 
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" className="btn-add-item">
              {editingId ? 'Update' : '+ Add'}
            </button>
            {editingId && (
              <button type="button" onClick={handleCancelEdit} style={{ background: '#ccc', border: 'none', borderRadius: '10px', padding: '10px', cursor: 'pointer' }}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Search & Filter Controls Bar */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: '#FDFBFA', padding: '14px 20px', borderRadius: '16px', border: '1px solid #EFE9E1' }}>
        <input 
          type="text"
          placeholder="🔍 Search items by name or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: '1px solid #EFE9E1', background: '#F9F6F0', fontSize: '0.9rem', color: '#3D271D', outline: 'none' }}
        />
        <select 
          value={selectedCategoryFilter}
          onChange={(e) => setSelectedCategoryFilter(e.target.value)}
          style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #EFE9E1', background: '#F9F6F0', fontSize: '0.9rem', color: '#3D271D', outline: 'none', minWidth: '180px' }}
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Menu Items Table */}
      <div className="history-table-container">
        {loading ? (
          <div className="no-history-box"><p>Loading menu items from Supabase...</p></div>
        ) : filteredItems.length === 0 ? (
          <div className="no-history-box">
            <p>No matching menu items found.</p>
          </div>
        ) : (
          <table className="history-table">
            <thead>
              <tr>
                <th>Icon</th>
                <th>Item Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Description</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontSize: '1.2rem' }}>{item.emoji || '🍽️'}</td>
                  <td><strong>{item.name}</strong></td>
                  <td>{getCategoryName(item.category_id)}</td>
                  <td>₹{item.price}</td>
                  <td className="history-date">{item.description || '—'}</td>
                  <td>
                    <span className={`history-status-badge ${item.is_available ? 'status-completed' : 'status-cancelled'}`}>
                      {item.is_available ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button 
                        className="btn-action btn-edit"
                        onClick={() => handleEditClick(item)}
                        style={{ backgroundColor: '#FFD000', color: '#311E18', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}
                      >
                        Edit
                      </button>
                      <button 
                        className="btn-action"
                        onClick={() => handleToggleAvailability(item.id, item.is_available)}
                        style={{ backgroundColor: '#311E18', color: '#FFD000', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem' }}
                      >
                        {item.is_available ? 'Mark Out' : 'Mark In'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}