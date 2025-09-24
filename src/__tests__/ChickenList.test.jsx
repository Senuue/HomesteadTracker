import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProvider } from '../test-utils';
import ChickenList from '../components/ChickenList';
import { storage } from '../utils/storage';

const noop = () => {};

describe('ChickenList filtering and tag chips', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('filters by text, status, and tags (clickable chips and autocomplete)', async () => {
    // Seed data
    storage.saveChickens([
      {
        id: '1',
        batchName: 'Spring Broilers',
        initialCount: 10,
        currentCount: 10,
        status: 'Active',
        tags: ['spring', 'broilers'],
        feedLogs: [],
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        batchName: 'Fall Layers',
        initialCount: 12,
        currentCount: 12,
        status: 'Culled',
        tags: ['fall', 'layers'],
        feedLogs: [],
        createdAt: new Date().toISOString(),
      },
    ]);

    renderWithProvider(
      <ChickenList onEdit={noop} onAdd={noop} onOpenFeedLogs={noop} onOpenTagManager={noop} />
    );

    // Text search
    await userEvent.type(screen.getByPlaceholderText(/search batches/i), 'Spring');
    expect(screen.getByText(/Spring Broilers/i)).toBeInTheDocument();
    expect(screen.queryByText(/Fall Layers/i)).not.toBeInTheDocument();

    // Clear text search by selecting the input and clearing it
    const search = screen.getByPlaceholderText(/search batches/i);
    await userEvent.clear(search);

    // Status filter
    await userEvent.selectOptions(screen.getByDisplayValue(/All Statuses/i), 'Active');
    expect(screen.getByText(/Spring Broilers/i)).toBeInTheDocument();
    expect(screen.queryByText(/Fall Layers/i)).not.toBeInTheDocument();

    // Click tag chip to filter by tag
    await userEvent.click(screen.getByText('spring'));
    expect(screen.getByText(/Spring Broilers/i)).toBeInTheDocument();

    // Use tag autocomplete to add another tag and switch to match all
    const tagInput = screen.getByPlaceholderText(/filter by tags/i);
    await userEvent.type(tagInput, 'bro');
    const matches = await screen.findAllByText('broilers');
    // Click the last match, which should be the suggestion item (chips render earlier in the DOM)
    await userEvent.click(matches[matches.length - 1]);

    // Enable match all (spring AND broilers)
    await userEvent.click(screen.getByLabelText(/match all/i));
    expect(screen.getByText(/Spring Broilers/i)).toBeInTheDocument();

    // Switching status to Culled should hide results
    await userEvent.selectOptions(screen.getByDisplayValue(/Active/i), 'Culled');
    expect(screen.queryByText(/Spring Broilers/i)).not.toBeInTheDocument();
  });
});
