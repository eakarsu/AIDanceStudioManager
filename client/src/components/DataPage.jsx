import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Edit3, Trash2, Eye, X } from 'lucide-react';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';
import Modal from './Modal';

export default function DataPage({ title, endpoint, columns, formFields, renderDetail }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet(endpoint);
      const arr = Array.isArray(res) ? res : res?.data || res?.results || [];
      setData(arr);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = data.filter((item) => {
    if (!search) return true;
    const lc = search.toLowerCase();
    return columns.some((col) => {
      const val = item[col.key];
      return val && String(val).toLowerCase().includes(lc);
    });
  });

  const openAdd = () => {
    setEditingItem(null);
    const initial = {};
    formFields.forEach((f) => { initial[f.key] = f.type === 'number' ? '' : ''; });
    setFormData(initial);
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    const initial = {};
    formFields.forEach((f) => { initial[f.key] = item[f.key] ?? ''; });
    setFormData(initial);
    setShowForm(true);
    setShowDetail(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...formData };
      formFields.forEach((f) => {
        if (f.type === 'number' && payload[f.key] !== '') {
          payload[f.key] = Number(payload[f.key]);
        }
      });
      if (editingItem) {
        await apiPut(`${endpoint}/${editingItem._id || editingItem.id}`, payload);
      } else {
        await apiPost(endpoint, payload);
      }
      setShowForm(false);
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await apiDelete(`${endpoint}/${selectedItem._id || selectedItem.id}`);
      setShowDeleteConfirm(false);
      setShowDetail(false);
      setSelectedItem(null);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const viewDetail = (item) => {
    setSelectedItem(item);
    setShowDetail(true);
  };

  return (
    <div className="data-page">
      <div className="data-page-header">
        <h1>{title}</h1>
        <div className="data-page-actions">
          <div className="search-bar">
            <Search size={18} />
            <input
              type="text"
              placeholder={`Search ${title.toLowerCase()}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus size={18} /> Add New
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error} <button onClick={() => setError('')}><X size={14} /></button></div>}

      {loading ? (
        <div className="loading-container"><div className="spinner" /><p>Loading...</p></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <p>No {title.toLowerCase()} found.</p>
          <button className="btn btn-primary" onClick={openAdd}><Plus size={18} /> Add your first one</button>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((col) => <th key={col.key}>{col.label}</th>)}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, idx) => (
                <tr key={item._id || item.id || idx} onClick={() => viewDetail(item)}>
                  {columns.map((col) => (
                    <td key={col.key}>{formatValue(item[col.key])}</td>
                  ))}
                  <td className="row-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="icon-btn" title="View" onClick={() => viewDetail(item)}><Eye size={16} /></button>
                    <button className="icon-btn" title="Edit" onClick={() => openEdit(item)}><Edit3 size={16} /></button>
                    <button className="icon-btn danger" title="Delete" onClick={() => { setSelectedItem(item); setShowDeleteConfirm(true); }}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      <Modal open={showDetail} onClose={() => setShowDetail(false)} title="Details" wide>
        {selectedItem && (
          <div className="detail-view">
            {renderDetail ? renderDetail(selectedItem) : (
              <div className="detail-grid">
                {Object.entries(selectedItem).filter(([k]) => k !== '__v').map(([key, val]) => (
                  <div key={key} className="detail-field">
                    <label>{formatLabel(key)}</label>
                    <span>{formatValue(val)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="detail-actions">
              <button className="btn btn-primary" onClick={() => openEdit(selectedItem)}><Edit3 size={16} /> Edit</button>
              <button className="btn btn-danger" onClick={() => setShowDeleteConfirm(true)}><Trash2 size={16} /> Delete</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Form Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editingItem ? `Edit ${title.slice(0, -1)}` : `Add ${title.slice(0, -1)}`}>
        <form onSubmit={handleSave} className="data-form">
          {formFields.map((field) => (
            <div key={field.key} className="form-group">
              <label htmlFor={field.key}>{field.label}</label>
              {field.type === 'select' ? (
                <select
                  id={field.key}
                  value={formData[field.key] || ''}
                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                  required={field.required}
                >
                  <option value="">Select...</option>
                  {(field.options || []).map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : field.type === 'textarea' ? (
                <textarea
                  id={field.key}
                  value={formData[field.key] || ''}
                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                  required={field.required}
                  rows={3}
                />
              ) : (
                <input
                  id={field.key}
                  type={field.type || 'text'}
                  value={formData[field.key] || ''}
                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                  required={field.required}
                />
              )}
            </div>
          ))}
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : editingItem ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Confirm Delete">
        <p>Are you sure you want to delete this item? This action cannot be undone.</p>
        <div className="form-actions">
          <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
          <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
        </div>
      </Modal>
    </div>
  );
}

function formatLabel(key) {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).replace(/_/g, ' ');
}

function formatValue(val) {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (Array.isArray(val)) return val.join(', ');
  if (typeof val === 'object') return JSON.stringify(val);
  const str = String(val);
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) return new Date(str).toLocaleDateString();
  return str;
}
