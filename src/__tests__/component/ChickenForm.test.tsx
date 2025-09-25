import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import ChickenForm from '@/components/ChickenForm';
import { api } from '@/services/apiClient';
import { renderWithProvider } from '@/test-utils';

describe('ChickenForm', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('shows date validation error when delivery is before order', async () => {
    (api as any).listChickens.mockResolvedValueOnce([]);
    renderWithProvider(<ChickenForm />);

    await userEvent.type(await screen.findByLabelText(/Batch Name/i), 'Dates');
    const initial = screen.getByLabelText(/Initial Count/i);
    await userEvent.clear(initial);
    await userEvent.type(initial, '5');

    // Set order after delivery to trigger validation error
    await userEvent.type(screen.getByLabelText(/Chick Order Date/i), '2024-02-01');
    await userEvent.type(screen.getByLabelText(/Chick Delivery Date/i), '2024-01-01');

    await userEvent.click(screen.getByRole('button', { name: /add batch/i }));

    // Expect the delivery date field to have error class
    await waitFor(() => {
      expect(screen.getByLabelText(/Chick Delivery Date/i)).toHaveClass('error');
    });
  });

  it('validates required fields and submits new batch', async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();

    // Ensure provider initial load resolves
    (api as any).listChickens.mockResolvedValueOnce([]);
    (api as any).addChicken.mockResolvedValueOnce({ id: 'new-1', batchName: 'Form Batch', initialCount: 12, currentCount: 12 });

    renderWithProvider(<ChickenForm onClose={onClose} onSuccess={onSuccess} />);

    // Try to submit empty
    await userEvent.click(screen.getByRole('button', { name: /add batch/i }));
    expect(await screen.findByText(/Batch name is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/Initial count must be greater than 0/i)).toBeInTheDocument();

    // Fill required fields
    await userEvent.type(await screen.findByLabelText(/Batch Name/i), 'Form Batch');
    const initial = screen.getByLabelText(/Initial Count/i);
    await userEvent.clear(initial);
    await userEvent.type(initial, '12');

    await userEvent.click(screen.getByRole('button', { name: /add batch/i }));

    // onSuccess + onClose should be called
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('handles numeric conversion for feed fields', async () => {
    (api as any).listChickens.mockResolvedValueOnce([]);
    (api as any).addChicken.mockResolvedValueOnce({ id: 'id-nums', batchName: 'Numbers', initialCount: 5, currentCount: 5, feedCost: 12.34, feedUsage: 7.8 });
    renderWithProvider(<ChickenForm />);

    await userEvent.type(screen.getByLabelText(/Batch Name/i), 'Numbers');
    await userEvent.clear(screen.getByLabelText(/Initial Count/i));
    await userEvent.type(screen.getByLabelText(/Initial Count/i), '5');
    await userEvent.type(screen.getByLabelText(/Feed Cost/i), '12.34');
    await userEvent.type(screen.getByLabelText(/Feed Usage/i), '7.8');

    await userEvent.click(screen.getByRole('button', { name: /add batch/i }));

    // basic assertion: no validation errors remain
    await waitFor(() => {
      expect(screen.queryByText(/cannot be negative/i)).not.toBeInTheDocument();
    });
  });

  it('submits numeric payloads (numbers, not strings)', async () => {
    (api as any).listChickens.mockResolvedValueOnce([]);
    const spy = (api as any).addChicken;
    spy.mockResolvedValueOnce({ id: 'numeric', batchName: 'Num', initialCount: 7, currentCount: 7, feedCost: 1.23, feedUsage: 4.5 });

    renderWithProvider(<ChickenForm />);

    await userEvent.type(await screen.findByLabelText(/Batch Name/i), 'Num');
    const initial = screen.getByLabelText(/Initial Count/i);
    await userEvent.clear(initial);
    await userEvent.type(initial, '7');
    await userEvent.type(screen.getByLabelText(/Feed Cost/i), '1.23');
    await userEvent.type(screen.getByLabelText(/Feed Usage/i), '4.5');
    await userEvent.click(screen.getByRole('button', { name: /add batch/i }));

    await waitFor(() => {
      const args = spy.mock.calls[0][0];
      expect(typeof args.initialCount).toBe('number');
      expect(typeof args.feedCost).toBe('number');
      expect(typeof args.feedUsage).toBe('number');
    });
  });

  it('prevents negative numbers in numeric fields (no submit when < min)', async () => {
    (api as any).listChickens.mockResolvedValueOnce([]);
    const spy = (api as any).addChicken;
    renderWithProvider(<ChickenForm />);

    await userEvent.type(await screen.findByLabelText(/Batch Name/i), 'Negatives');
    const initial = screen.getByLabelText(/Initial Count/i);
    await userEvent.clear(initial);
    await userEvent.type(initial, '-1');
    await userEvent.click(screen.getByRole('button', { name: /add batch/i }));

    // Native HTML validation (min=1) blocks submit, so addChicken is not called
    await waitFor(() => {
      expect(spy).not.toHaveBeenCalled();
    });
  });

  it('shows cull date validation error when cull is before delivery', async () => {
    (api as any).listChickens.mockResolvedValueOnce([]);
    renderWithProvider(<ChickenForm />);

    await userEvent.type(await screen.findByLabelText(/Batch Name/i), 'CullCheck');
    const initial = screen.getByLabelText(/Initial Count/i);
    await userEvent.clear(initial);
    await userEvent.type(initial, '5');

    await userEvent.type(screen.getByLabelText(/Chick Delivery Date/i), '2024-02-01');
    await userEvent.type(screen.getByLabelText(/Cull Date/i), '2024-01-15');
    await userEvent.click(screen.getByRole('button', { name: /add batch/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/Cull Date/i)).toHaveClass('error');
    });
  });

  it('blocks submit when negative current/feedCost/feedUsage due to native validation', async () => {
    (api as any).listChickens.mockResolvedValueOnce([]);
    const addSpy = (api as any).addChicken;
    renderWithProvider(<ChickenForm />);

    await userEvent.type(await screen.findByLabelText(/Batch Name/i), 'NegFields');
    const initial = screen.getByLabelText(/Initial Count/i);
    await userEvent.clear(initial);
    await userEvent.type(initial, '5');
    await userEvent.type(screen.getByLabelText(/Current Count/i), '-1');
    await userEvent.type(screen.getByLabelText(/Feed Cost/i), '-0.5');
    await userEvent.type(screen.getByLabelText(/Feed Usage/i), '-2');

    await userEvent.click(screen.getByRole('button', { name: /add batch/i }));

    await waitFor(() => {
      expect(addSpy).not.toHaveBeenCalled();
    });
  });

  it('edit mode pre-fills fields and submits updateChicken with parsed tags', async () => {
    (api as any).listChickens.mockResolvedValueOnce([
      {
        id: 'edit-1',
        batchName: 'EditMe',
        status: 'Active',
        tags: ['one', 'two'],
        initialCount: 3,
        currentCount: 2,
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ]);
    const spy = (api as any).updateChicken;
    spy.mockResolvedValueOnce({ id: 'edit-1', batchName: 'Edited', status: 'Culled', tags: ['one', 'two', 'x'], initialCount: 3, currentCount: 2 });

    renderWithProvider(<ChickenForm chickenId="edit-1" />);

    // Ensure fields are valid by retyping required ones
    const nameInput = await screen.findByLabelText(/Batch Name/i);
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Edited');
    const initialInput = screen.getByLabelText(/Initial Count/i);
    await userEvent.clear(initialInput);
    await userEvent.type(initialInput, '3');

    // Append a tag and submit
    const tagsInput = await screen.findByLabelText(/Tags/i);
    await userEvent.type(tagsInput, ', x');
    await userEvent.click(screen.getByRole('button', { name: /update batch/i }));

    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
      const payload = spy.mock.calls[0][1];
      expect(Array.isArray(payload.tags)).toBe(true);
      expect(payload.tags).toContain('x');
    });
  });

  it('submit failure shows submit error and logs', async () => {
    (api as any).listChickens.mockResolvedValueOnce([]);
    const spy = (api as any).addChicken;
    spy.mockRejectedValueOnce(new Error('fail'));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderWithProvider(<ChickenForm />);

    await userEvent.type(await screen.findByLabelText(/Batch Name/i), 'Boom');
    const initial = screen.getByLabelText(/Initial Count/i);
    await userEvent.clear(initial);
    await userEvent.type(initial, '5');
    await userEvent.click(screen.getByRole('button', { name: /add batch/i }));

    expect(await screen.findByText(/Failed to save chicken data/i)).toBeInTheDocument();
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it('defaults currentCount to initialCount when left blank', async () => {
    (api as any).listChickens.mockResolvedValueOnce([]);
    const spy = (api as any).addChicken;
    spy.mockResolvedValueOnce({ id: 'cc', batchName: 'CC', initialCount: 9, currentCount: 9 });

    renderWithProvider(<ChickenForm />);
    await userEvent.type(await screen.findByLabelText(/Batch Name/i), 'CC');
    const initial = screen.getByLabelText(/Initial Count/i);
    await userEvent.clear(initial);
    await userEvent.type(initial, '9');
    await userEvent.click(screen.getByRole('button', { name: /add batch/i }));

    await waitFor(() => {
      const payload = spy.mock.calls[0][0];
      expect(payload.currentCount).toBe(9);
    });
  });

  it('cancel button triggers onClose', async () => {
    (api as any).listChickens.mockResolvedValueOnce([]);
    const onClose = vi.fn();
    renderWithProvider(<ChickenForm onClose={onClose} />);
    await screen.findByText(/Add New Chicken Batch/i);
    await userEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('edit mode pre-fills status Culled, tags from non-array string, and notes', async () => {
    (api as any).listChickens.mockResolvedValueOnce([
      {
        id: 'prefill-1',
        batchName: 'Prefill',
        status: undefined,
        tags: 'one, two',
        chickDeliveryDate: '2024-01-01',
        cullDate: '2024-03-01',
        initialCount: 10,
        currentCount: 8,
        notes: 'hello',
      },
    ]);
    renderWithProvider(<ChickenForm chickenId="prefill-1" />);
    // Status should fall back to Culled due to cullDate
    expect(await screen.findByDisplayValue('Culled')).toBeInTheDocument();
    // Tags input should show the string as-is
    expect(screen.getByLabelText(/Tags/i)).toHaveValue('one, two');
    // Notes prefilled
    expect(screen.getByLabelText(/Notes/i)).toHaveValue('hello');
  });

  it('clears field-specific error when the field changes', async () => {
    (api as any).listChickens.mockResolvedValueOnce([]);
    renderWithProvider(<ChickenForm />);
    // Submit empty to trigger batchName error
    await userEvent.click(screen.getByRole('button', { name: /Add Batch/i }));
    expect(await screen.findByText(/Batch name is required/i)).toBeInTheDocument();
    // Type into batchName to clear the error
    await userEvent.type(screen.getByLabelText(/Batch Name/i), 'Name');
    await waitFor(() => {
      expect(screen.queryByText(/Batch name is required/i)).not.toBeInTheDocument();
    });
  });
});
