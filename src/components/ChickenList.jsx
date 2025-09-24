import React, { useMemo, useState } from 'react';
import { useChicken } from '../contexts/ChickenContext';
import { format } from 'date-fns';
import { Edit, Trash2, Plus, NotebookPen, Filter, X } from 'lucide-react';

const ChickenList = ({ onEdit, onAdd, onOpenFeedLogs, onOpenTagManager }) => {
  const { chickens, deleteChicken, loading } = useChicken();
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // All | Active | Culled
  const [sortBy, setSortBy] = useState('created-desc'); // created-desc | name-asc | delivery-desc | feedcost-desc | current-desc
  const [selectedTags, setSelectedTags] = useState([]); // multi-select
  const [matchAllTags, setMatchAllTags] = useState(false); // AND vs OR
  const [tagQuery, setTagQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('All');
    setSortBy('created-desc');
    setSelectedTags([]);
    setMatchAllTags(false);
    setTagQuery('');
    setShowSuggestions(false);
  };

  const handleDelete = async (id) => {
    try {
      await deleteChicken(id);
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting chicken:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const calculateDaysAlive = (deliveryDate, cullDate) => {
    if (!deliveryDate) return 'N/A';
    
    const startDate = new Date(deliveryDate);
    const endDate = cullDate ? new Date(cullDate) : new Date();
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return `${diffDays} days`;
  };

  const calculateMortality = (initial, current) => {
    if (!initial || initial === 0) return '0%';
    const mortality = ((initial - current) / initial) * 100;
    return `${mortality.toFixed(1)}%`;
  };

  // Derived, filtered, sorted list
  const allTags = useMemo(() => (
    Array.from(new Set(
      chickens.flatMap(c => Array.isArray(c.tags) ? c.tags : [])
        .map(t => t.trim())
        .filter(Boolean)
    )).sort((a,b) => a.localeCompare(b))
  ), [chickens]);

  const suggestions = useMemo(() => {
    const q = tagQuery.trim().toLowerCase();
    if (!q) return [];
    return allTags.filter(t => !selectedTags.includes(t) && t.toLowerCase().includes(q)).slice(0, 8);
  }, [tagQuery, allTags, selectedTags]);

  const toggleSelectedTag = (tag) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };
  const addSelectedTag = (tag) => {
    if (!tag) return;
    if (!selectedTags.includes(tag)) setSelectedTags(prev => [...prev, tag]);
    setTagQuery('');
    setShowSuggestions(false);
  };
  const removeSelectedTag = (tag) => setSelectedTags(prev => prev.filter(t => t !== tag));

  const filtered = chickens
    .filter((c) => {
      const term = searchTerm.trim().toLowerCase();
      if (!term) return true;
      return (
        (c.batchName || '').toLowerCase().includes(term) ||
        (c.notes || '').toLowerCase().includes(term)
      );
    })
    .filter((c) => (statusFilter === 'All' ? true : (c.status || (c.cullDate ? 'Culled' : 'Active')) === statusFilter))
    .filter((c) => {
      if (selectedTags.length === 0) return true;
      const tags = Array.isArray(c.tags) ? c.tags : [];
      if (matchAllTags) {
        // AND: every selected tag must be present
        return selectedTags.every(t => tags.includes(t));
      }
      // OR: at least one selected tag present
      return selectedTags.some(t => tags.includes(t));
    });

  if (loading) {
    return <div className="loading">Loading chicken data...</div>;
  }

  const sorted = filtered.slice().sort((a, b) => {
    switch (sortBy) {
      case 'name-asc':
        return (a.batchName || '').localeCompare(b.batchName || '');
      case 'delivery-desc': {
        const da = a.chickDeliveryDate ? new Date(a.chickDeliveryDate).getTime() : 0;
        const db = b.chickDeliveryDate ? new Date(b.chickDeliveryDate).getTime() : 0;
        return db - da;
      }
      case 'feedcost-desc':
        return Number(b.feedCost || 0) - Number(a.feedCost || 0);
      case 'current-desc':
        return Number((b.currentCount ?? b.initialCount) || 0) - Number((a.currentCount ?? a.initialCount) || 0);
      case 'created-desc':
      default: {
        const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return cb - ca;
      }
    }
  });

  return (
    <div className="chicken-list">
      <div className="list-header">
        <h2>Chicken Batches</h2>
        <div className="filters-bar">
          <input
            type="text"
            placeholder="Search batches..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Culled">Culled</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="created-desc">Newest Created</option>
            <option value="name-asc">Name (A→Z)</option>
            <option value="delivery-desc">Latest Delivery</option>
            <option value="feedcost-desc">Highest Feed Cost</option>
            <option value="current-desc">Most Chickens</option>
          </select>
          <div className="tag-filter">
            <div className="selected-tags">
              {selectedTags.map(tag => (
                <span
                  key={tag}
                  className="tag-chip selected"
                  title={`Remove tag: ${tag}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => removeSelectedTag(tag)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); removeSelectedTag(tag); } }}
                >
                  <Filter size={12} className="tag-icon" aria-hidden="true" />
                  {tag}
                  <X size={12} className="remove-icon" aria-hidden="true" />
                </span>
              ))}
            </div>
            <div className="tag-autocomplete">
              <input
                type="text"
                placeholder="Filter by tags..."
                value={tagQuery}
                onChange={(e) => { setTagQuery(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (tagQuery.trim()) addSelectedTag(tagQuery.trim());
                  }
                }}
              />
              {suggestions.length > 0 && (
                <div className="suggestions">
                  {suggestions.map((s) => (
                    <span
                      key={s}
                      className="tag-chip"
                      title={`Add filter: ${s}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => addSelectedTag(s)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          addSelectedTag(s);
                        }
                      }}
                    >
                      <Filter size={12} className="tag-icon" aria-hidden="true" />
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <label className="match-toggle" title="Match all selected tags">
              <input type="checkbox" checked={matchAllTags} onChange={(e) => setMatchAllTags(e.target.checked)} /> match all
            </label>
          </div>
          <button className="cancel-button" type="button" onClick={clearFilters} title="Clear all filters">
            Clear Filters
          </button>
          <button className="add-button" type="button" onClick={() => onOpenTagManager && onOpenTagManager()}>
            Manage Tags
          </button>
          <button className="add-button" onClick={onAdd}>
            <Plus size={20} />
            Add New Batch
          </button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="empty-state">
          <p>No chicken batches match your filters.</p>
          <button className="add-button" onClick={onAdd}>
            <Plus size={20} />
            Add Your First Batch
          </button>
        </div>
      ) : (
        <div className="chicken-grid">
          {sorted.map((chicken) => (
            <div key={chicken.id} className="chicken-card">
              <div className="card-header">
                <h3>{chicken.batchName} {chicken.status ? <span style={{marginLeft: 8, fontSize: '0.8rem', color: chicken.status === 'Culled' ? '#dc2626' : '#059669'}}>• {chicken.status}</span> : null}</h3>
                <div className="card-actions">
                  <button 
                    className="edit-button"
                    onClick={() => onOpenFeedLogs && onOpenFeedLogs(chicken.id)}
                    title="View feed logs"
                  >
                    <NotebookPen size={16} />
                  </button>
                  <button 
                    className="edit-button"
                    onClick={() => onEdit(chicken.id)}
                    title="Edit batch"
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    className="delete-button"
                    onClick={() => setDeleteConfirm(chicken.id)}
                    title="Delete batch"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="card-content">
                {Array.isArray(chicken.tags) && chicken.tags.length > 0 && (
                  <div className="tag-list">
                    {chicken.tags.map((tag) => (
                      <span
                        key={tag}
                        className={`tag-chip${selectedTags.includes(tag) ? ' selected' : ''}`}
                        onClick={() => toggleSelectedTag(tag)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSelectedTag(tag); } }}
                        title={selectedTags.includes(tag) ? 'Remove tag from filter' : 'Filter by this tag'}
                      >
                        <Filter size={12} className="tag-icon" aria-hidden="true" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="info-row">
                  <span className="label">Order Date:</span>
                  <span className="value">{formatDate(chicken.chickOrderDate)}</span>
                </div>
                
                <div className="info-row">
                  <span className="label">Delivery Date:</span>
                  <span className="value">{formatDate(chicken.chickDeliveryDate)}</span>
                </div>

                <div className="info-row">
                  <span className="label">Count:</span>
                  <span className="value">
                    {chicken.currentCount || chicken.initialCount} / {chicken.initialCount}
                    {chicken.initialCount !== chicken.currentCount && (
                      <span className="mortality">
                        ({calculateMortality(chicken.initialCount, chicken.currentCount || chicken.initialCount)} mortality)
                      </span>
                    )}
                  </span>
                </div>

                <div className="info-row">
                  <span className="label">Days Alive:</span>
                  <span className="value">{calculateDaysAlive(chicken.chickDeliveryDate, chicken.cullDate)}</span>
                </div>

                <div className="info-row">
                  <span className="label">Feed Cost:</span>
                  <span className="value">${(chicken.feedCost || 0).toFixed(2)}</span>
                </div>

                <div className="info-row">
                  <span className="label">Feed Usage:</span>
                  <span className="value">{(chicken.feedUsage || 0).toFixed(1)} lbs</span>
                </div>

                {chicken.cullDate && (
                  <div className="info-row">
                    <span className="label">Cull Date:</span>
                    <span className="value">{formatDate(chicken.cullDate)}</span>
                  </div>
                )}

                {chicken.notes && (
                  <div className="info-row notes">
                    <span className="label">Notes:</span>
                    <span className="value">{chicken.notes}</span>
                  </div>
                )}
              </div>

              <div className="card-footer">
                <small>
                  Created: {formatDate(chicken.createdAt)}
                  {chicken.updatedAt && chicken.updatedAt !== chicken.createdAt && (
                    <> • Updated: {formatDate(chicken.updatedAt)}</>
                  )}
                </small>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Confirm Delete</h3>
            <p>Are you sure you want to delete this chicken batch? This action cannot be undone.</p>
            <div className="modal-actions">
              <button 
                className="cancel-button"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button 
                className="delete-button"
                onClick={() => handleDelete(deleteConfirm)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChickenList;
