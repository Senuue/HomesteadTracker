import React, { useMemo, useState } from 'react';
import { useChicken } from '@/contexts/ChickenContext';
import { format } from 'date-fns';

type Props = {
  chickenId: string;
  onClose: () => void;
};

type FormState = {
  date: string;
  pounds: string;
  cost: string;
  notes: string;
};

const emptyForm: FormState = {
  date: new Date().toISOString().slice(0, 10),
  pounds: '',
  cost: '',
  notes: '',
};

const FeedLogModal: React.FC<Props> = ({ chickenId, onClose }) => {
  const { getChickenById, getFeedLogs, addFeedLog, updateFeedLog, deleteFeedLog } = useChicken();
  const chicken = useMemo(() => getChickenById(chickenId), [chickenId, getChickenById]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const logs = getFeedLogs(chickenId).slice().sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime());

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const startEdit = (log: any) => {
    setEditingId(log.id);
    setForm({
      date: log.date || new Date().toISOString().slice(0, 10),
      pounds: String(log.pounds ?? ''),
      cost: String(log.cost ?? ''),
      notes: log.notes || '',
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
  };

  const validate = () => {
    if (!form.date) return 'Date is required';
    const pounds = parseFloat(form.pounds || '0');
    const cost = parseFloat(form.cost || '0');
    if (pounds < 0) return 'Pounds must be >= 0';
    if (cost < 0) return 'Cost must be >= 0';
    return '';
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    const payload = {
      date: form.date,
      pounds: form.pounds ? parseFloat(form.pounds) : 0,
      cost: form.cost ? parseFloat(form.cost) : 0,
      notes: form.notes || '',
    };

    if (editingId) {
      updateFeedLog(chickenId, editingId, payload);
    } else {
      addFeedLog(chickenId, payload);
    }

    resetForm();
  };

  const handleDelete = (id: string) => {
    deleteFeedLog(chickenId, id);
    if (editingId === id) resetForm();
  };

  const totals = useMemo(() => {
    return logs.reduce(
      (acc, l) => {
        acc.pounds += Number(l.pounds || 0);
        acc.cost += Number(l.cost || 0);
        return acc;
      },
      { pounds: 0, cost: 0 }
    );
  }, [logs]);

  if (!chicken) return null;

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 700, width: '95%' }}>
        <h3>Feed Logs — {chicken.batchName}</h3>

        <form onSubmit={handleSubmit} className="chicken-form" style={{ paddingTop: 0 }}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="date">Date</label>
              <input id="date" name="date" type="date" value={form.date} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label htmlFor="pounds">Pounds</label>
              <input id="pounds" name="pounds" type="number" min={0} step={0.1} value={form.pounds} onChange={handleChange} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="cost">Cost ($)</label>
              <input id="cost" name="cost" type="number" min={0} step={0.01} value={form.cost} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label htmlFor="notes">Notes</label>
              <input id="notes" name="notes" type="text" value={form.notes} onChange={handleChange} placeholder="Optional" />
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button type="button" className="cancel-button" onClick={resetForm}>
              Clear
            </button>
            <button type="submit" className="submit-button">
              {editingId ? 'Update Entry' : 'Add Entry'}
            </button>
          </div>
        </form>

        <div style={{ marginTop: '1rem', marginBottom: '1rem', color: '#4a5568' }}>
          <strong>Totals:</strong> {totals.pounds.toFixed(1)} lbs • ${totals.cost.toFixed(2)}
        </div>

        {logs.length === 0 ? (
          <p style={{ color: '#4a5568' }}>No feed entries yet. Add your first entry above.</p>
        ) : (
          <div className="chicken-grid" style={{ gridTemplateColumns: '1fr' }}>
            {logs.map((log: any) => (
              <div key={log.id} className="chicken-card">
                <div className="card-header">
                  <h3 style={{ fontSize: '1.1rem' }}>{format(new Date(log.date || ''), 'MMM dd, yyyy')}</h3>
                  <div className="card-actions">
                    <button className="edit-button" onClick={() => startEdit(log)}>
                      Edit
                    </button>
                    <button className="delete-button" onClick={() => handleDelete(log.id)}>
                      Delete
                    </button>
                  </div>
                </div>
                <div className="card-content">
                  <div className="info-row">
                    <span className="label">Pounds</span>
                    <span className="value">{Number(log.pounds || 0).toFixed(1)}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Cost</span>
                    <span className="value">${Number(log.cost || 0).toFixed(2)}</span>
                  </div>
                  {log.notes ? (
                    <div className="info-row">
                      <span className="label">Notes</span>
                      <span className="value">{log.notes}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: '1rem' }}>
          <button className="cancel-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedLogModal;
