import React, { useState, useEffect, useRef } from 'react';
import { 
  QrCode, 
  Printer, 
  Download, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  ExternalLink, 
  Eye, 
  X,
  Users,
  Sparkles
} from 'lucide-react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { supabase } from '../supabaseClient';
import badgeCupImg from '../assets/badge-cup.png';
import './TablesQRManagementPage.css';

export default function TablesQRManagementPage() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form state
  const [editingId, setEditingId] = useState(null);
  const [tableNo, setTableNo] = useState('');
  const [seats, setSeats] = useState(4);
  const [displayOrder, setDisplayOrder] = useState(1);
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState('');

  // Selected table for QR Stand Preview
  const [previewTable, setPreviewTable] = useState(null);
  const [isBulkPrintOpen, setIsBulkPrintOpen] = useState(false);
  const [tableToDelete, setTableToDelete] = useState(null);

  const canvasRef = useRef(null);

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data, error } = await supabase
        .from('cafe_tables')
        .select('*')
        .order('display_order', { ascending: true })
        .order('id', { ascending: true });

      if (error) throw error;
      setTables(data || []);
      if (!editingId && data) {
        setDisplayOrder(data.length + 1);
      }
    } catch (err) {
      console.error('Error fetching cafe_tables:', err);
      setErrorMsg(err.message || 'Failed to fetch cafe tables.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setTableNo('');
    setSeats(4);
    setDisplayOrder(tables.length + 1);
    setIsActive(true);
    setNotes('');
  };

  // Submit Add / Edit Table
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tableNo.trim()) {
      alert('Please enter a Table Number.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = {
        table_no: tableNo.trim(),
        seats: parseInt(seats, 10) || 2,
        display_order: parseInt(displayOrder, 10) || 0,
        is_active: Boolean(isActive),
        notes: notes.trim() || null,
      };

      if (editingId) {
        const { error: updateErr } = await supabase
          .from('cafe_tables')
          .update(payload)
          .eq('id', editingId);

        if (updateErr) throw updateErr;
        setSuccessMsg(`Table ${tableNo} updated successfully!`);
      } else {
        const { error: insertErr } = await supabase
          .from('cafe_tables')
          .insert([payload]);

        if (insertErr) throw insertErr;
        setSuccessMsg(`Table ${tableNo} added to your cafe!`);
      }

      resetForm();
      await fetchTables();
    } catch (err) {
      console.error('Error saving table:', err);
      setErrorMsg(err.message || 'Failed to save table.');
    } finally {
      setSaving(false);
    }
  };

  // Edit Table click
  const handleEditClick = (table) => {
    setEditingId(table.id);
    setTableNo(table.table_no || '');
    setSeats(table.seats || 2);
    setDisplayOrder(table.display_order ?? 0);
    setIsActive(table.is_active !== false);
    setNotes(table.notes || '');
    window.scrollTo({ top: 100, behavior: 'smooth' });
  };

  // Toggle Active / Inactive
  const handleToggleActive = async (table) => {
    const nextVal = table.is_active === false ? true : false;
    // Optimistic UI update
    setTables((prev) =>
      prev.map((t) => (t.id === table.id ? { ...t, is_active: nextVal } : t))
    );

    try {
      const { error } = await supabase
        .from('cafe_tables')
        .update({ is_active: nextVal })
        .eq('id', table.id);

      if (error) throw error;
    } catch (err) {
      console.error('Error toggling table active state:', err);
      alert('Failed to update table status: ' + err.message);
      fetchTables();
    }
  };

  // Delete Table
  const confirmDelete = async () => {
    if (!tableToDelete) return;
    const { id, table_no: delNo } = tableToDelete;
    setTableToDelete(null);

    try {
      const { error } = await supabase
        .from('cafe_tables')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSuccessMsg(`Table ${delNo} was removed.`);
      setTables((prev) => prev.filter((t) => t.id !== id));
      if (editingId === id) resetForm();
    } catch (err) {
      console.error('Error deleting table:', err);
      alert('Failed to delete table: ' + err.message);
    }
  };

  // Build the live Table ordering URL for QR encoding
  const getTableUrl = (tNo, qrToken) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://yaarana.cafe';
    const tokenParam = qrToken ? `&token=${qrToken}` : '';
    return `${origin}/menu?table=${encodeURIComponent(tNo)}${tokenParam}`;
  };

  // Download QR as PNG
  const handleDownloadPNG = (tbl) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const imageURI = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = imageURI;
    link.download = `Yaarana_Table_${tbl.table_no}_QR.png`;
    link.click();
  };

  // Trigger Print Stand
  const handlePrint = () => {
    window.print();
  };

  // Computed metrics
  const totalTables = tables.length;
  const activeCount = tables.filter((t) => t.is_active !== false).length;
  const inactiveCount = tables.filter((t) => t.is_active === false).length;
  const totalSeats = tables.reduce((sum, t) => sum + (t.is_active !== false ? Number(t.seats || 0) : 0), 0);

  return (
    <div className="tables-qr-page">
      {/* Header */}
      <div className="tqr-header">
        <h2 className="tqr-title">📱 Tables & QR Codes</h2>
        <p className="tqr-subtitle">
          Configure physical dining tables, monitor active status, and generate branded contactless QR code stands for seamless customer ordering.
        </p>

        {/* Stats Grid */}
        <div className="tqr-stats-grid">
          <div className="tqr-stat-card">
            <div className="tqr-stat-icon total">🪑</div>
            <div className="tqr-stat-content">
              <h4>Total Tables</h4>
              <p className="stat-number">{totalTables}</p>
            </div>
          </div>
          <div className="tqr-stat-card">
            <div className="tqr-stat-icon active">✅</div>
            <div className="tqr-stat-content">
              <h4>Active for Dining</h4>
              <p className="stat-number">{activeCount}</p>
            </div>
          </div>
          <div className="tqr-stat-card">
            <div className="tqr-stat-icon inactive">⚠️</div>
            <div className="tqr-stat-content">
              <h4>Inactive / Reserved</h4>
              <p className="stat-number">{inactiveCount}</p>
            </div>
          </div>
          <div className="tqr-stat-card">
            <div className="tqr-stat-icon capacity">👥</div>
            <div className="tqr-stat-content">
              <h4>Dine-In Capacity</h4>
              <p className="stat-number">{totalSeats} Seats</p>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div style={{ background: '#ECFDF5', color: '#065F46', padding: '12px 18px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #A7F3D0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>✅ {successMsg}</span>
          <button type="button" onClick={() => setSuccessMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
        </div>
      )}

      {errorMsg && (
        <div style={{ background: '#FEF2F2', color: '#991B1B', padding: '12px 18px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #FECACA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚠️ {errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
        </div>
      )}

      {/* Add / Edit Form Card */}
      <div className="tqr-form-card">
        <h3>
          <QrCode size={22} color="#FF7A2F" />
          {editingId ? 'Edit Table Configuration' : 'Add New Table'}
        </h3>

        <form onSubmit={handleSubmit}>
          <div className="tqr-form-grid">
            <div className="tqr-form-group">
              <label htmlFor="t-no">Table Number / Label *</label>
              <input
                id="t-no"
                type="text"
                placeholder="e.g. 11 or Patio 2"
                value={tableNo}
                onChange={(e) => setTableNo(e.target.value)}
                required
              />
            </div>

            <div className="tqr-form-group">
              <label htmlFor="t-seats">Seating Capacity (Guests)</label>
              <input
                id="t-seats"
                type="number"
                min="1"
                max="20"
                value={seats}
                onChange={(e) => setSeats(e.target.value)}
              />
            </div>

            <div className="tqr-form-group">
              <label htmlFor="t-order">Display Order</label>
              <input
                id="t-order"
                type="number"
                min="0"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
              />
            </div>

            <div className="tqr-form-group">
              <label htmlFor="t-notes">Zone / Notes (Optional)</label>
              <input
                id="t-notes"
                type="text"
                placeholder="e.g. Window side, Balcony"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.9rem', color: '#3D271D', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#FF7A2F' }}
              />
              Active & Available for QR Dine-In Ordering
            </label>
          </div>

          <div className="tqr-actions">
            <button type="submit" className="btn-tqr-save" disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Update Table' : '+ Add Table'}
            </button>
            {editingId && (
              <button type="button" className="btn-tqr-cancel" onClick={resetForm}>
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Toolbar */}
      <div className="tqr-toolbar">
        <h3 style={{ margin: 0, fontFamily: "'Luckiest Guy', cursive", fontSize: '1.25rem', color: '#3D271D' }}>
          Configured Tables ({tables.length})
        </h3>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="btn-bulk-print"
            onClick={() => setIsBulkPrintOpen(true)}
            title="Print all table QR stand cards at once"
          >
            <Printer size={16} /> Print All QR Stands
          </button>

          <button
            type="button"
            onClick={fetchTables}
            style={{ background: '#FFFFFF', border: '1px solid #EFE9E1', borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', color: '#6B554B' }}
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Tables List */}
      <div className="tqr-table-container">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: '#8C786E' }}>
            <RefreshCw className="spin" size={32} color="#FF7A2F" />
            <h4 style={{ margin: '12px 0 0 0', fontFamily: "'Luckiest Guy', cursive" }}>Loading tables...</h4>
          </div>
        ) : tables.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: '#8C786E' }}>
            <QrCode size={44} color="#D1C7BD" />
            <h4 style={{ margin: '12px 0 0 0', fontFamily: "'Luckiest Guy', cursive" }}>No tables found</h4>
            <p>Add your cafe tables above to generate QR codes for each table.</p>
          </div>
        ) : (
          <table className="tqr-table">
            <thead>
              <tr>
                <th>Table</th>
                <th>Capacity</th>
                <th>Order</th>
                <th>Status</th>
                <th>Zone / Notes</th>
                <th>QR Code</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tables.map((tbl) => (
                <tr key={tbl.id}>
                  <td>
                    <strong style={{ fontSize: '1rem', color: '#3D271D' }}>
                      🍽️ Table {tbl.table_no}
                    </strong>
                  </td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#6B554B' }}>
                      <Users size={14} /> {tbl.seats} Seats
                    </span>
                  </td>
                  <td>
                    <span style={{ background: '#F5F1EB', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.8rem' }}>
                      #{tbl.display_order ?? 0}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={tbl.is_active !== false ? 'table-badge-active' : 'table-badge-inactive'}
                      onClick={() => handleToggleActive(tbl)}
                      title="Click to toggle table active/inactive status"
                    >
                      {tbl.is_active !== false ? <CheckCircle size={14} /> : <XCircle size={14} />}
                      {tbl.is_active !== false ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td>
                    <span style={{ color: '#8C786E', fontSize: '0.85rem' }}>
                      {tbl.notes || '—'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-preview-qr"
                      onClick={() => setPreviewTable(tbl)}
                      title="Preview, Download, or Print Table Stand QR"
                    >
                      <Eye size={14} /> QR Stand
                    </button>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => handleEditClick(tbl)}
                        style={{ background: '#FFD000', border: 'none', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', color: '#311E18' }}
                        title="Edit Table"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setTableToDelete(tbl)}
                        style={{ background: '#FEE2E2', border: 'none', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', color: '#DC2626' }}
                        title="Delete Table"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* QR Stand Preview Modal */}
      {previewTable && (
        <div className="qr-modal-overlay" onClick={() => setPreviewTable(null)}>
          <div className="qr-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="qr-modal-close-btn"
              onClick={() => setPreviewTable(null)}
              aria-label="Close"
            >
              <X size={20} />
            </button>

            <h3 style={{ fontFamily: "'Luckiest Guy', cursive", color: '#3D271D', margin: 0, fontSize: '1.4rem' }}>
              Table Stand QR Code
            </h3>

            {/* Stand Preview Container (Target for Printing) */}
            <div className="print-area">
              <div className="qr-stand-card">
                <img
                  src={badgeCupImg}
                  alt="Yaarana Badge"
                  style={{ width: '48px', height: '48px', objectFit: 'contain', marginBottom: '8px' }}
                />
                <div className="stand-brand">YAARANA CAFE</div>
                <div className="stand-tagline">Tasty Treats for Every Yaar</div>

                <div className="stand-table-title">
                  TABLE {previewTable.table_no}
                </div>

                <div className="stand-qr-box">
                  <QRCodeSVG
                    value={getTableUrl(previewTable.table_no, previewTable.qr_token)}
                    size={190}
                    level="H"
                    includeMargin={false}
                    imageSettings={{
                      src: badgeCupImg,
                      x: undefined,
                      y: undefined,
                      height: 38,
                      width: 38,
                      excavate: true,
                    }}
                  />
                  {/* Hidden canvas for high-res PNG export */}
                  <QRCodeCanvas
                    ref={canvasRef}
                    value={getTableUrl(previewTable.table_no, previewTable.qr_token)}
                    size={600}
                    level="H"
                    includeMargin={true}
                    style={{ display: 'none' }}
                  />
                </div>

                <p className="stand-instruction">
                  Scan to View Menu & Order
                </p>
                <p className="stand-subtext">
                  Direct table delivery • Fresh & Contactless
                </p>
              </div>
            </div>

            <div style={{ fontSize: '0.78rem', color: '#8C786E', wordBreak: 'break-all', marginBottom: '16px' }}>
              Encoded URL: <code>{getTableUrl(previewTable.table_no, previewTable.qr_token)}</code>
            </div>

            {/* Modal Actions */}
            <div className="qr-modal-actions">
              <button
                type="button"
                className="btn-qr-action print"
                onClick={handlePrint}
              >
                <Printer size={16} /> Print Stand Card
              </button>

              <button
                type="button"
                className="btn-qr-action download"
                onClick={() => handleDownloadPNG(previewTable)}
              >
                <Download size={16} /> Download PNG
              </button>

              <button
                type="button"
                className="btn-qr-action"
                style={{ background: '#EFE9E1', color: '#311E18' }}
                onClick={() => {
                  window.open(getTableUrl(previewTable.table_no, previewTable.qr_token), '_blank');
                }}
              >
                <ExternalLink size={16} /> Test Scan URL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Print Preview Modal */}
      {isBulkPrintOpen && (
        <div className="qr-modal-overlay" onClick={() => setIsBulkPrintOpen(false)}>
          <div className="qr-modal-card" style={{ maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="qr-modal-close-btn"
              onClick={() => setIsBulkPrintOpen(false)}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontFamily: "'Luckiest Guy', cursive", color: '#3D271D', margin: '0 0 10px 0' }}>
              Bulk Table QR Stands Print Sheet
            </h3>
            <p style={{ color: '#6B554B', fontSize: '0.9rem', marginBottom: '20px' }}>
              Ready to print stands for all {activeCount} active tables. Each card is formatted with clean boundaries for acrylic table tents.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <button
                type="button"
                className="btn-qr-action print"
                onClick={handlePrint}
                style={{ fontSize: '1rem', padding: '12px 28px' }}
              >
                <Printer size={18} /> Print All Stands Now
              </button>
            </div>

            <div className="print-area">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                {tables.filter((t) => t.is_active !== false).map((tbl) => (
                  <div key={tbl.id} className="qr-stand-card" style={{ margin: '0' }}>
                    <img
                      src={badgeCupImg}
                      alt="Yaarana Badge"
                      style={{ width: '40px', height: '40px', objectFit: 'contain', marginBottom: '6px' }}
                    />
                    <div className="stand-brand" style={{ fontSize: '1.5rem' }}>YAARANA CAFE</div>
                    <div className="stand-tagline">Tasty Treats for Every Yaar</div>

                    <div className="stand-table-title" style={{ fontSize: '1.3rem', padding: '4px 18px' }}>
                      TABLE {tbl.table_no}
                    </div>

                    <div className="stand-qr-box" style={{ padding: '12px' }}>
                      <QRCodeSVG
                        value={getTableUrl(tbl.table_no, tbl.qr_token)}
                        size={160}
                        level="H"
                        includeMargin={false}
                      />
                    </div>

                    <p className="stand-instruction" style={{ fontSize: '0.85rem' }}>
                      Scan to View Menu & Order
                    </p>
                    <p className="stand-subtext">
                      {tbl.seats} Seats • Contactless Ordering
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {tableToDelete && (
        <div className="qr-modal-overlay" onClick={() => setTableToDelete(null)}>
          <div className="qr-modal-card" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Luckiest Guy', cursive", color: '#3D271D', margin: '0 0 10px 0' }}>
              ⚠️ Delete Table {tableToDelete.table_no}?
            </h3>
            <p style={{ color: '#6B554B', fontSize: '0.9rem', marginBottom: '24px' }}>
              Are you sure you want to delete Table {tableToDelete.table_no}? Existing orders associated with this table will be preserved, but the QR code will become inactive.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={confirmDelete}
                style={{ background: '#DC2626', color: '#FFF', fontWeight: 800, padding: '10px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer' }}
              >
                Yes, Delete
              </button>
              <button
                type="button"
                onClick={() => setTableToDelete(null)}
                style={{ background: '#EFE9E1', color: '#3D271D', fontWeight: 700, padding: '10px 18px', borderRadius: '10px', border: 'none', cursor: 'pointer' }}
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
