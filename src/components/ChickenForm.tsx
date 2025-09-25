import React, { useEffect, useState } from 'react';
import { useChicken } from '@/contexts/ChickenContext';
import type { Chicken } from '@/types';

type ChickenFormProps = {
  chickenId?: string;
  onClose?: () => void;
  onSuccess?: () => void;
};

type FormState = {
  batchName: string;
  status: Chicken['status'] | '';
  tags: string; // comma separated in the UI
  chickOrderDate: string;
  chickDeliveryDate: string;
  initialCount: string;
  currentCount: string;
  feedCost: string;
  feedUsage: string;
  cullDate: string;
  notes: string;
};

type FormErrors = Partial<Record<keyof FormState | 'submit', string>>;

const ChickenForm: React.FC<ChickenFormProps> = ({ chickenId, onClose, onSuccess }) => {
  const { addChicken, updateChicken, getChickenById } = useChicken();
  const [formData, setFormData] = useState<FormState>({
    batchName: '',
    status: 'Active',
    tags: '',
    chickOrderDate: '',
    chickDeliveryDate: '',
    initialCount: '',
    currentCount: '',
    feedCost: '',
    feedUsage: '',
    cullDate: '',
    notes: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load existing chicken data if editing
  useEffect(() => {
    if (chickenId) {
      const chicken = getChickenById(chickenId);
      if (chicken) {
        setFormData({
          batchName: chicken.batchName || '',
          status: (chicken.status as Chicken['status']) || (chicken.cullDate ? 'Culled' : 'Active'),
          tags: Array.isArray(chicken.tags) ? chicken.tags.join(', ') : (chicken.tags as unknown as string) || '',
          chickOrderDate: chicken.chickOrderDate || '',
          chickDeliveryDate: chicken.chickDeliveryDate || '',
          initialCount: String(chicken.initialCount || ''),
          currentCount: String(chicken.currentCount || ''),
          feedCost: String(chicken.feedCost || ''),
          feedUsage: String(chicken.feedUsage || ''),
          cullDate: chicken.cullDate || '',
          notes: (chicken.notes as string) || '',
        });
      }
    }
  }, [chickenId, getChickenById]);

  const handleChange: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> = (e) => {
    const { name, value } = e.target as HTMLInputElement;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name as keyof FormState]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.batchName.trim()) newErrors.batchName = 'Batch name is required';
    const initial = Number(formData.initialCount);
    const current = formData.currentCount ? Number(formData.currentCount) : undefined;
    const feedCost = formData.feedCost ? Number(formData.feedCost) : undefined;
    const feedUsage = formData.feedUsage ? Number(formData.feedUsage) : undefined;

    if (!initial || initial <= 0) newErrors.initialCount = 'Initial count must be greater than 0';
    if (current !== undefined && current < 0) newErrors.currentCount = 'Current count cannot be negative';
    if (feedCost !== undefined && feedCost < 0) newErrors.feedCost = 'Feed cost cannot be negative';
    if (feedUsage !== undefined && feedUsage < 0) newErrors.feedUsage = 'Feed usage cannot be negative';

    // Date validation
    if (formData.chickOrderDate && formData.chickDeliveryDate) {
      if (new Date(formData.chickOrderDate) > new Date(formData.chickDeliveryDate)) {
        newErrors.chickDeliveryDate = 'Delivery date cannot be before order date';
      }
    }
    if (formData.cullDate && formData.chickDeliveryDate) {
      if (new Date(formData.cullDate) < new Date(formData.chickDeliveryDate)) {
        newErrors.cullDate = 'Cull date cannot be before delivery date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const chickenData: Partial<Chicken> = {
        ...formData,
        tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        initialCount: parseInt(formData.initialCount),
        currentCount: formData.currentCount ? parseInt(formData.currentCount) : parseInt(formData.initialCount),
        feedCost: formData.feedCost ? parseFloat(formData.feedCost) : 0,
        feedUsage: formData.feedUsage ? parseFloat(formData.feedUsage) : 0,
      } as unknown as Partial<Chicken>;

      if (chickenId) {
        await updateChicken(chickenId, chickenData);
      } else {
        await addChicken(chickenData);
      }

      onSuccess && onSuccess();
      onClose && onClose();
    } catch (error) {
      console.error('Error saving chicken data:', error);
      setErrors({ submit: 'Failed to save chicken data. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="chicken-form-overlay">
      <div className="chicken-form-modal">
        <div className="form-header">
          <h2>{chickenId ? 'Edit Chicken Batch' : 'Add New Chicken Batch'}</h2>
          <button type="button" className="close-button" onClick={onClose} disabled={isSubmitting}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="chicken-form">
          <div className="form-group">
            <label htmlFor="status">Status</label>
            <select id="status" name="status" value={formData.status} onChange={handleChange}>
              <option value="Active">Active</option>
              <option value="Culled">Culled</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="tags">Tags (comma-separated)</label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              placeholder="e.g., broilers, spring, hatchery A"
            />
          </div>

          <div className="form-group">
            <label htmlFor="batchName">Batch Name *</label>
            <input
              type="text"
              id="batchName"
              name="batchName"
              value={formData.batchName}
              onChange={handleChange}
              className={errors.batchName ? 'error' : ''}
              placeholder="e.g., Spring 2024 Batch"
            />
            {errors.batchName && <span className="error-message">{errors.batchName}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="chickOrderDate">Chick Order Date</label>
              <input type="date" id="chickOrderDate" name="chickOrderDate" value={formData.chickOrderDate} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label htmlFor="chickDeliveryDate">Chick Delivery Date</label>
              <input
                type="date"
                id="chickDeliveryDate"
                name="chickDeliveryDate"
                value={formData.chickDeliveryDate}
                onChange={handleChange}
                className={errors.chickDeliveryDate ? 'error' : ''}
              />
              {errors.chickDeliveryDate && <span className="error-message">{errors.chickDeliveryDate}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="initialCount">Initial Count *</label>
              <input
                type="number"
                id="initialCount"
                name="initialCount"
                value={formData.initialCount}
                onChange={handleChange}
                className={errors.initialCount ? 'error' : ''}
                min="1"
                placeholder="Number of chicks"
              />
              {errors.initialCount && <span className="error-message">{errors.initialCount}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="currentCount">Current Count</label>
              <input
                type="number"
                id="currentCount"
                name="currentCount"
                value={formData.currentCount}
                onChange={handleChange}
                className={errors.currentCount ? 'error' : ''}
                min="0"
                placeholder="Current number of chickens"
              />
              {errors.currentCount && <span className="error-message">{errors.currentCount}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="feedCost">Feed Cost ($)</label>
              <input
                type="number"
                id="feedCost"
                name="feedCost"
                value={formData.feedCost}
                onChange={handleChange}
                className={errors.feedCost ? 'error' : ''}
                min="0"
                step="0.01"
                placeholder="0.00"
              />
              {errors.feedCost && <span className="error-message">{errors.feedCost}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="feedUsage">Feed Usage (lbs)</label>
              <input
                type="number"
                id="feedUsage"
                name="feedUsage"
                value={formData.feedUsage}
                onChange={handleChange}
                className={errors.feedUsage ? 'error' : ''}
                min="0"
                step="0.1"
                placeholder="0.0"
              />
              {errors.feedUsage && <span className="error-message">{errors.feedUsage}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="cullDate">Cull Date</label>
            <input type="date" id="cullDate" name="cullDate" value={formData.cullDate} onChange={handleChange} className={errors.cullDate ? 'error' : ''} />
            {errors.cullDate && <span className="error-message">{errors.cullDate}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} rows={3} placeholder="Additional notes about this batch..." />
          </div>

          {errors.submit && <div className="error-message">{errors.submit}</div>}

          <div className="form-actions">
            <button type="button" className="cancel-button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="submit-button" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : chickenId ? 'Update Batch' : 'Add Batch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChickenForm;
