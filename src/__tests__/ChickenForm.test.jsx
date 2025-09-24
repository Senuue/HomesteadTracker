import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChickenForm from '../components/ChickenForm';
import { renderWithProvider } from '../test-utils';

describe('ChickenForm', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('validates required fields and submits new batch', async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();

    renderWithProvider(<ChickenForm onClose={onClose} onSuccess={onSuccess} />);

    // Try to submit empty
    await userEvent.click(screen.getByRole('button', { name: /add batch/i }));
    expect(await screen.findByText(/Batch name is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/Initial count must be greater than 0/i)).toBeInTheDocument();

    // Fill required fields
    await userEvent.type(screen.getByLabelText(/Batch Name/i), 'Form Batch');
    const initial = screen.getByLabelText(/Initial Count/i);
    await userEvent.clear(initial);
    await userEvent.type(initial, '12');

    await userEvent.click(screen.getByRole('button', { name: /add batch/i }));

    // onSuccess + onClose should be called
    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('handles numeric conversion for feed fields', async () => {
    renderWithProvider(<ChickenForm />);

    await userEvent.type(screen.getByLabelText(/Batch Name/i), 'Numbers');
    await userEvent.clear(screen.getByLabelText(/Initial Count/i));
    await userEvent.type(screen.getByLabelText(/Initial Count/i), '5');
    await userEvent.type(screen.getByLabelText(/Feed Cost/i), '12.34');
    await userEvent.type(screen.getByLabelText(/Feed Usage/i), '7.8');

    await userEvent.click(screen.getByRole('button', { name: /add batch/i }));

    // re-open list to verify via storage would require routing; basic assertion: no validation errors remain
    expect(screen.queryByText(/cannot be negative/i)).not.toBeInTheDocument();
  });
});
