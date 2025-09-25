import React, { useEffect, useMemo, useState } from 'react';

import { useChicken } from '@/contexts/ChickenContext';

type Props = {
  onClose: () => void;
};

const TagManagerModal: React.FC<Props> = ({ onClose }) => {
  const { getAllTags, renameTag, deleteTag, mergeTags } = useChicken();
  const [tagsMap, setTagsMap] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [renameFrom, setRenameFrom] = useState('');
  const [renameTo, setRenameTo] = useState('');
  const [mergeTo, setMergeTo] = useState('');
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const map = await getAllTags();
      setTagsMap(map || {});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tags = useMemo(() => Object.entries(tagsMap).map(([name, count]) => ({ name, count })), [tagsMap]);

  const toggle = (tag: string) => {
    setSelected((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const handleRename: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    if (!renameFrom || !renameTo) return;
    (async () => {
      setLoading(true);
      try {
        await renameTag(renameFrom, renameTo);
        setRenameFrom('');
        setRenameTo('');
        await refresh();
      } finally {
        setLoading(false);
      }
    })();
  };

  const handleDelete = (tag: string) => {
    if (!tag) return;
    (async () => {
      setLoading(true);
      try {
        await deleteTag(tag);
        setSelected((prev) => prev.filter((t) => t !== tag));
        await refresh();
      } finally {
        setLoading(false);
      }
    })();
  };

  const handleMerge: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    if (selected.length < 2 || !mergeTo.trim()) return;
    (async () => {
      setLoading(true);
      try {
        await mergeTags(selected, mergeTo.trim());
        setSelected([]);
        setMergeTo('');
        await refresh();
      } finally {
        setLoading(false);
      }
    })();
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 700, width: '95%' }}>
        <h3>Manage Tags</h3>

        <div className="chicken-grid" style={{ gridTemplateColumns: '1fr' }}>
          <div className="chicken-card">
            <div className="card-header">
              <h3 style={{ fontSize: '1.1rem' }}>All Tags</h3>
            </div>
            <div className="card-content">
              {loading ? (
                <span style={{ color: '#4a5568' }}>Loading tags…</span>
              ) : (
                <div className="tag-list">
                  {tags.length === 0 ? (
                    <span style={{ color: '#4a5568' }}>No tags yet.</span>
                  ) : (
                    tags.map(({ name, count }) => (
                      <span
                        key={name}
                        className={`tag-chip${selected.includes(name) ? ' selected' : ''}`}
                        title={`${count} batch${count === 1 ? '' : 'es'}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => toggle(name)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggle(name);
                          }
                        }}
                      >
                        {name} <span style={{ opacity: 0.7 }}>({count})</span>
                        <button
                          className="delete-button"
                          style={{ marginLeft: 8 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(name);
                          }}
                        >
                          Delete
                        </button>
                      </span>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="chicken-card">
            <div className="card-header">
              <h3 style={{ fontSize: '1.1rem' }}>Rename Tag</h3>
            </div>
            <form className="chicken-form" onSubmit={handleRename} style={{ paddingTop: 0 }}>
              <div className="form-row">
                <div className="form-group">
                  <label>From</label>
                  <input value={renameFrom} onChange={(e) => setRenameFrom(e.target.value)} placeholder="Existing tag" />
                </div>
                <div className="form-group">
                  <label>To</label>
                  <input value={renameTo} onChange={(e) => setRenameTo(e.target.value)} placeholder="New tag" />
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="submit-button">
                  Rename
                </button>
              </div>
            </form>
          </div>

          <div className="chicken-card">
            <div className="card-header">
              <h3 style={{ fontSize: '1.1rem' }}>Merge Tags</h3>
            </div>
            <form className="chicken-form" onSubmit={handleMerge} style={{ paddingTop: 0 }}>
              <div className="form-group">
                <label>Selected ({selected.length})</label>
                <div className="selected-tags">
                  {selected.map((t) => (
                    <span key={t} className="tag-chip selected" onClick={() => toggle(t)}>
                      {t} ×
                    </span>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Merge into</label>
                <input value={mergeTo} onChange={(e) => setMergeTo(e.target.value)} placeholder="Target tag" />
              </div>
              <div className="form-actions">
                <button type="submit" className="submit-button" disabled={selected.length < 2 || !mergeTo.trim()}>
                  Merge
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: '1rem' }}>
          <button className="cancel-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TagManagerModal;
