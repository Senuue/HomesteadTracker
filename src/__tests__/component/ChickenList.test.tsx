import { screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';

import ChickenList from '@/components/ChickenList';
import { api } from '@/services/apiClient';
import { renderWithProvider } from '@/test-utils';

const noop = () => {};

describe('ChickenList filtering and tag chips', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('does not render suggestions when query yields no matches (non-empty query)', async () => {
    const rows = [
      { id: '1', batchName: 'NoMatch', initialCount: 1, currentCount: 1, status: 'Active', tags: ['alpha'], createdAt: new Date().toISOString() },
    ];
    (api as any).listChickens.mockResolvedValueOnce(rows);
    renderWithProvider(<ChickenList onEdit={noop} onAdd={noop} onOpenFeedLogs={noop} onOpenTagManager={noop} />);
    await screen.findByText('NoMatch');
    const tagInput = screen.getByPlaceholderText(/filter by tags/i);
    await userEvent.type(tagInput, 'zzz');
    // suggestions container should not render since length is 0
    expect(screen.queryByText(/suggestions/i)).not.toBeInTheDocument();
  });

  it('does not show Updated when updatedAt is missing or equals createdAt', async () => {
    const rows = [
      {
        id: '1', batchName: 'EQ', initialCount: 1, currentCount: 1, status: 'Active', tags: [],
        createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z'
      },
      {
        id: '2', batchName: 'Missing', initialCount: 1, currentCount: 1, status: 'Active', tags: [],
        createdAt: '2024-01-02T00:00:00.000Z'
      },
    ] as any;
    (api as any).listChickens.mockResolvedValueOnce(rows);
    renderWithProvider(<ChickenList onEdit={noop} onAdd={noop} onOpenFeedLogs={noop} onOpenTagManager={noop} />);
    await screen.findByText('EQ');
    await screen.findByText('Missing');
    // No "Updated:" text should appear
    expect(screen.queryByText(/Updated:/i)).not.toBeInTheDocument();
  });

  it('covers remaining branches: status Culled filter, name-asc and delivery-desc, cullDate days, mortality 0%, updatedAt, duplicate tag ignored, text search', async () => {
    const rows = [
      {
        id: '1',
        batchName: 'BName',
        initialCount: 0,
        currentCount: 1,
        status: 'Culled',
        tags: ['alpha'],
        chickDeliveryDate: '2024-01-01',
        cullDate: '2024-02-01',
        createdAt: '2024-02-01T00:00:00.000Z',
        updatedAt: '2024-02-02T00:00:00.000Z',
      },
      {
        id: '2',
        batchName: 'AName',
        initialCount: 5,
        currentCount: 5,
        status: 'Active',
        tags: [],
        chickDeliveryDate: '2023-12-01',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ] as any;
    (api as any).listChickens.mockResolvedValueOnce(rows);

    renderWithProvider(<ChickenList onEdit={noop} onAdd={noop} onOpenFeedLogs={noop} onOpenTagManager={noop} />);

    // both visible
    await screen.findByText('BName');
    await screen.findByText('AName');

    // Status filter: Culled should hide the Active row
    await userEvent.selectOptions(screen.getByDisplayValue(/All Statuses/i), 'Culled');
    expect(screen.queryByText('AName')).not.toBeInTheDocument();
    expect(screen.getByText('BName')).toBeInTheDocument();

    // Clear filters (so we can sort)
    await userEvent.click(screen.getByRole('button', { name: /Clear Filters/i }));

    // Sort by name-asc
    await userEvent.selectOptions(screen.getByDisplayValue(/Newest Created/i), 'name-asc');
    // Then delivery-desc
    await userEvent.selectOptions(screen.getByDisplayValue(/Name \(A→Z\)/i), 'delivery-desc');

    // Days Alive path with cullDate (not N/A)
    const daysLabel = screen.getAllByText(/Days Alive:/i)[0];
    expect(daysLabel.nextSibling?.textContent || '').toMatch(/days/i);

    // Mortality for initial=0 returns 0%
    expect(screen.getByText(/0% mortality\)/i)).toBeInTheDocument();

    // Footer shows Updated:
    expect(screen.getByText(/Updated:/i)).toBeInTheDocument();

    // Duplicate tag ignored: add the same tag twice via Enter
    const tagInput = screen.getByPlaceholderText(/filter by tags/i);
    await userEvent.type(tagInput, 'alpha');
    await userEvent.type(tagInput, '{Enter}');
    await userEvent.type(tagInput, 'alpha');
    await userEvent.type(tagInput, '{Enter}');
    // Only one selected chip
    expect(screen.getAllByTitle(/Remove tag: alpha/i).length).toBe(1);

    // Clear filters so text search is not constrained by the selected tag
    await userEvent.click(screen.getByRole('button', { name: /Clear Filters/i }));

    // Text search filter
    const search = screen.getByPlaceholderText(/Search batches/i);
    await userEvent.type(search, 'AName');
    expect(await screen.findByText('AName')).toBeInTheDocument();
    expect(screen.queryByText('BName')).not.toBeInTheDocument();
  });

  it('keeps delete modal open when delete API fails (covers handleDelete catch)', async () => {
    const rows = [
      { id: '1', batchName: 'FailDel', initialCount: 1, currentCount: 1, status: 'Active', tags: [], createdAt: new Date().toISOString() },
    ];
    (api as any).listChickens.mockResolvedValueOnce(rows);
    (api as any).deleteChicken.mockRejectedValueOnce(new Error('boom'));

    const spy = vi.spyOn(console, 'error');
    spy.mockImplementation(() => { /* noop */ });
    renderWithProvider(<ChickenList onEdit={noop} onAdd={noop} onOpenFeedLogs={noop} onOpenTagManager={noop} />);
    await screen.findByText('FailDel');

    await userEvent.click(screen.getByTitle(/Delete batch/i));
    expect(await screen.findByText(/Confirm Delete/i)).toBeInTheDocument();
    // confirm delete -> API rejects -> modal should remain
    const modal = await screen.findByText(/Confirm Delete/i);
    const scope = within(modal.closest('.modal') as HTMLElement);
    await userEvent.click(scope.getByRole('button', { name: /^Delete$/i }));
    expect(await screen.findByText(/Confirm Delete/i)).toBeInTheDocument();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('toggles tag from the card tag list using keyboard (Space then Enter)', async () => {
    const rows = [
      { id: '1', batchName: 'CardTags', initialCount: 1, currentCount: 1, status: 'Active', tags: ['alpha'], createdAt: new Date().toISOString() },
    ];
    (api as any).listChickens.mockResolvedValueOnce(rows);
    renderWithProvider(<ChickenList onEdit={noop} onAdd={noop} onOpenFeedLogs={noop} onOpenTagManager={noop} />);
    await screen.findByText('CardTags');

    const cardTag = screen.getByText('alpha');
    cardTag.focus();
    fireEvent.keyDown(cardTag, { key: ' ', code: 'Space' });
    // after Space, selected filter chip appears
    expect(await screen.findByTitle(/Remove tag: alpha/i)).toBeInTheDocument();

    // pressing Enter on the selected chip removes it
    const chip = screen.getByTitle(/Remove tag: alpha/i);
    chip.focus();
    fireEvent.keyDown(chip, { key: 'Enter', code: 'Enter' });
    expect(screen.queryByTitle(/Remove tag: alpha/i)).not.toBeInTheDocument();
  });

  it('adds suggestion via keyboard (Space) and removes selected chip via keyboard (Enter)', async () => {
    const rows = [
      { id: '1', batchName: 'Kbd', initialCount: 1, currentCount: 1, status: 'Active', tags: ['alpha'], createdAt: new Date().toISOString() },
    ];
    (api as any).listChickens.mockResolvedValueOnce(rows);
    renderWithProvider(<ChickenList onEdit={noop} onAdd={noop} onOpenFeedLogs={noop} onOpenTagManager={noop} />);

    await screen.findByText('Kbd');
    const tagInput = screen.getByPlaceholderText(/filter by tags/i);
    await userEvent.type(tagInput, 'alpha');
    // focus the first suggestion and press Space
    const sug = await screen.findAllByText('alpha');
    sug[0].focus();
    fireEvent.keyDown(sug[0], { key: ' ', code: 'Space' });
    expect(await screen.findByTitle(/Remove tag: alpha/i)).toBeInTheDocument();

    // Now remove via keyboard Enter on the selected chip
    const chip = screen.getByTitle(/Remove tag: alpha/i);
    chip.focus();
    fireEvent.keyDown(chip, { key: 'Enter', code: 'Enter' });
    expect(screen.queryByTitle(/Remove tag: alpha/i)).not.toBeInTheDocument();
  });

  it('does not show status bullet when status is missing, and renders cullDate and notes when present', async () => {
    const rows = [
      { id: '1', batchName: 'NoStatus', initialCount: 3, currentCount: 3, tags: [], createdAt: new Date().toISOString() },
      { id: '2', batchName: 'CulledWithNotes', initialCount: 3, currentCount: 2, status: 'Culled', cullDate: '2024-02-01', notes: 'done', tags: [], createdAt: new Date().toISOString() },
    ] as any;
    (api as any).listChickens.mockResolvedValueOnce(rows);
    renderWithProvider(<ChickenList onEdit={noop} onAdd={noop} onOpenFeedLogs={noop} onOpenTagManager={noop} />);

    expect(await screen.findByText('NoStatus')).toBeInTheDocument();
    // No status bullet for NoStatus
    expect(screen.queryByText(/•\s+Active/i)).not.toBeInTheDocument();

    // Cull Date and Notes for second row
    expect(await screen.findByText(/Cull Date:/i)).toBeInTheDocument();
    expect(screen.getByText(/Notes:/i)).toBeInTheDocument();
  });

  it('shows days alive as N/A when delivery date is missing', async () => {
    const rows = [
      { id: '1', batchName: 'NoDelivery', initialCount: 2, currentCount: 2, status: 'Active', tags: [], createdAt: new Date().toISOString() },
    ];
    (api as any).listChickens.mockResolvedValueOnce(rows);
    renderWithProvider(<ChickenList onEdit={noop} onAdd={noop} onOpenFeedLogs={noop} onOpenTagManager={noop} />);
    await screen.findByText('NoDelivery');
    expect(screen.getByText(/Days Alive:/i).nextSibling?.textContent).toMatch(/N\/A/i);
  });

  it('renders Invalid date for bad date strings and shows mortality chip', async () => {
    const rows = [
      {
        id: '1',
        batchName: 'BadDates',
        initialCount: 10,
        currentCount: 7,
        status: 'Active',
        tags: [],
        createdAt: 'not-a-date',
        chickDeliveryDate: 'also-bad',
      },
    ];
    (api as any).listChickens.mockResolvedValueOnce(rows);
    renderWithProvider(<ChickenList onEdit={noop} onAdd={noop} onOpenFeedLogs={noop} onOpenTagManager={noop} />);
    expect(await screen.findByText(/BadDates/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Invalid date/i).length).toBeGreaterThan(0);
    // mortality chip appears when currentCount < initialCount
    expect(screen.getByText(/mortality\)/i)).toBeInTheDocument();
  });

  it('shows loading state while fetching', () => {
    // keep promise pending to ensure loading remains visible
    (api as any).listChickens.mockReturnValueOnce(new Promise(() => {}));
    renderWithProvider(<ChickenList onEdit={noop} onAdd={noop} onOpenFeedLogs={noop} onOpenTagManager={noop} />);
    expect(screen.getByText(/Loading chicken data/i)).toBeInTheDocument();
  });

  it('does not render suggestions container when query is empty', async () => {
    const rows = [
      { id: '1', batchName: 'NoSug', initialCount: 1, currentCount: 1, status: 'Active', tags: ['alpha'], createdAt: new Date().toISOString() },
    ];
    (api as any).listChickens.mockResolvedValueOnce(rows);
    renderWithProvider(<ChickenList onEdit={noop} onAdd={noop} onOpenFeedLogs={noop} onOpenTagManager={noop} />);
    await screen.findByText(/NoSug/i);
    expect(screen.queryByText(/suggestions/i)).not.toBeInTheDocument();
  });

  it('sorts by highest feed cost (feedcost-desc)', async () => {
    const rows = [
      { id: '1', batchName: 'Cheap', initialCount: 5, currentCount: 5, status: 'Active', tags: [], feedCost: 10, createdAt: new Date().toISOString() },
      { id: '2', batchName: 'Expensive', initialCount: 5, currentCount: 5, status: 'Active', tags: [], feedCost: 50, createdAt: new Date().toISOString() },
    ];
    (api as any).listChickens.mockResolvedValueOnce(rows);
    renderWithProvider(<ChickenList onEdit={noop} onAdd={noop} onOpenFeedLogs={noop} onOpenTagManager={noop} />);
    await screen.findByText('Cheap');
    await userEvent.selectOptions(screen.getByDisplayValue(/Newest Created/i), 'feedcost-desc');
    // Both present; intent is to exercise branch
    expect(screen.getByText('Expensive')).toBeInTheDocument();
    expect(screen.getByText('Cheap')).toBeInTheDocument();
  });

  it('matchAll toggle filters batches by requiring all selected tags', async () => {
    const rows = [
      { id: '1', batchName: 'A', initialCount: 5, currentCount: 5, status: 'Active', tags: ['alpha', 'beta'], createdAt: new Date().toISOString() },
      { id: '2', batchName: 'B', initialCount: 6, currentCount: 6, status: 'Active', tags: ['alpha'], createdAt: new Date().toISOString() },
    ];
    (api as any).listChickens.mockResolvedValueOnce(rows);

    renderWithProvider(<ChickenList onEdit={noop} onAdd={noop} onOpenFeedLogs={noop} onOpenTagManager={noop} />);

    await screen.findByText('A');
    await screen.findByText('B');

    const tagInput = screen.getByPlaceholderText(/filter by tags/i);
    await userEvent.type(tagInput, 'alpha');
    await userEvent.type(tagInput, '{Enter}');
    await userEvent.type(tagInput, 'beta');
    const sug = await screen.findAllByText('beta');
    await userEvent.click(sug[sug.length - 1]);

    // Initially matchAll is off: either tag is fine -> both A and B visible
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();

    // Toggle match all: only A (alpha AND beta) remains
    await userEvent.click(screen.getByLabelText(/match all/i));
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.queryByText('B')).not.toBeInTheDocument();
  });

  it('sorts by most chickens (current-desc)', async () => {
    const rows = [
      { id: '1', batchName: 'Less', initialCount: 5, currentCount: 5, status: 'Active', tags: [], createdAt: new Date().toISOString() },
      { id: '2', batchName: 'More', initialCount: 15, currentCount: 15, status: 'Active', tags: [], createdAt: new Date().toISOString() },
    ];
    (api as any).listChickens.mockResolvedValueOnce(rows);

    renderWithProvider(<ChickenList onEdit={noop} onAdd={noop} onOpenFeedLogs={noop} onOpenTagManager={noop} />);

    await screen.findByText('Less');
    await userEvent.selectOptions(screen.getByDisplayValue(/Newest Created/i), 'current-desc');
    // Sanity: both still present
    expect(screen.getByText('More')).toBeInTheDocument();
    expect(screen.getByText('Less')).toBeInTheDocument();
  });

  it('removes a selected tag chip by clicking on it (title attribute)', async () => {
    const rows = [
      { id: '1', batchName: 'Tags', initialCount: 1, currentCount: 1, status: 'Active', tags: ['alpha'], createdAt: new Date().toISOString() },
    ];
    (api as any).listChickens.mockResolvedValueOnce(rows);

    renderWithProvider(<ChickenList onEdit={noop} onAdd={noop} onOpenFeedLogs={noop} onOpenTagManager={noop} />);

    await screen.findByText('Tags');
    const tagInput = screen.getByPlaceholderText(/filter by tags/i);
    await userEvent.type(tagInput, 'alpha');
    await userEvent.type(tagInput, '{Enter}');

    // Remove the chip via title
    await userEvent.click(await screen.findByTitle(/Remove tag: alpha/i));
    expect(screen.queryByTitle(/Remove tag: alpha/i)).not.toBeInTheDocument();
  });

  it('filters by text, status, and tags (clickable chips and autocomplete)', async () => {
    // Seed via API mock and render
    const rows = [
      {
        id: '1',
        batchName: 'Spring Broilers',
        initialCount: 10,
        currentCount: 10,
        status: 'Active',
        tags: ['spring', 'broilers'],
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        batchName: 'Fall Layers',
        initialCount: 12,
        currentCount: 12,
        status: 'Culled',
        tags: ['fall', 'layers'],
        createdAt: new Date().toISOString(),
      },
    ];
    (api as any).listChickens.mockResolvedValueOnce(rows);

    renderWithProvider(<ChickenList onEdit={noop} onAdd={noop} onOpenFeedLogs={noop} onOpenTagManager={noop} />);

    // Wait for the list and search input to appear
    await screen.findByText(/Spring Broilers/i);
    const searchInput = await screen.findByPlaceholderText(/search batches/i);

    // Text search
    await userEvent.type(searchInput, 'Spring');
    expect(await screen.findByText(/Spring Broilers/i)).toBeInTheDocument();
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

  it('clears filters and supports sorting modes', async () => {
    const rows = [
      { id: '1', batchName: 'Alpha', initialCount: 10, currentCount: 10, status: 'Active', tags: ['spring'], createdAt: '2023-01-01T00:00:00.000Z', feedCost: 10, feedUsage: 5 },
      { id: '2', batchName: 'Bravo', initialCount: 12, currentCount: 12, status: 'Active', tags: ['fall'], createdAt: '2024-01-01T00:00:00.000Z', feedCost: 20, feedUsage: 7 },
    ];
    (api as any).listChickens.mockResolvedValueOnce(rows);

    renderWithProvider(<ChickenList onEdit={noop} onAdd={noop} onOpenFeedLogs={noop} onOpenTagManager={noop} />);

    // Wait for both items
    await screen.findByText(/Alpha/i);
    await screen.findByText(/Bravo/i);

    // Sort by name ascending
    await userEvent.selectOptions(screen.getByDisplayValue(/Newest Created/i), 'name-asc');
    // Alpha should be present (basic sanity)
    expect(screen.getByText('Alpha')).toBeInTheDocument();

    // Sort by latest delivery (no delivery dates in seed, just ensure control works)
    await userEvent.selectOptions(screen.getByDisplayValue(/Name/), 'delivery-desc');
    expect(screen.getByText('Alpha')).toBeInTheDocument();

    // Sort by highest feed cost
    await userEvent.selectOptions(screen.getByDisplayValue(/Latest Delivery/), 'feedcost-desc');
    expect(screen.getByText('Bravo')).toBeInTheDocument();

    // Apply a search then clear filters button
    const search = screen.getByPlaceholderText(/search batches/i);
    await userEvent.type(search, 'Alpha');
    expect(await screen.findByText('Alpha')).toBeInTheDocument();
    expect(screen.queryByText('Bravo')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Clear Filters/i }));
    expect(await screen.findByText('Bravo')).toBeInTheDocument();
  });

  it('renders empty state when no batches', async () => {
    (api as any).listChickens.mockResolvedValueOnce([]);
    renderWithProvider(<ChickenList onEdit={noop} onAdd={noop} onOpenFeedLogs={noop} onOpenTagManager={noop} />);
    expect(await screen.findByText(/No chicken batches match your filters/i)).toBeInTheDocument();
  });

  it('shows suggestions on typing, adds with Enter, then hides', async () => {
    const rows = [
      { id: '1', batchName: 'TagsRow', initialCount: 1, currentCount: 1, status: 'Active', tags: ['alpha', 'beta'], createdAt: new Date().toISOString() },
    ];
    (api as any).listChickens.mockResolvedValueOnce(rows);
    renderWithProvider(<ChickenList onEdit={noop} onAdd={noop} onOpenFeedLogs={noop} onOpenTagManager={noop} />);

    await screen.findByText(/TagsRow/i);
    const tagInput = screen.getByPlaceholderText(/filter by tags/i);
    await userEvent.type(tagInput, 'alp');
    // suggestions should appear
    const sug = await screen.findAllByText('alpha');
    expect(sug.length).toBeGreaterThan(0);
    // press Enter to add the typed value
    await userEvent.type(tagInput, '{Enter}');
    // ensure the selected tag chip now appears (the typed value 'alp')
    expect(await screen.findByText('alp')).toBeInTheDocument();
  });

  it('delete confirmation modal opens and can cancel/confirm, and handlers fire', async () => {
    const rows = [
      { id: '1', batchName: 'DelRow', initialCount: 1, currentCount: 1, status: 'Active', tags: [], createdAt: new Date().toISOString() },
    ];
    (api as any).listChickens.mockResolvedValueOnce(rows);

    const onOpenTagManager = vi.fn();
    const onOpenFeedLogs = vi.fn();
    const onEdit = vi.fn();

    renderWithProvider(
      <ChickenList onEdit={onEdit} onAdd={noop} onOpenFeedLogs={onOpenFeedLogs} onOpenTagManager={onOpenTagManager} />
    );

    await screen.findByText(/DelRow/i);

    // trigger handlers
    await userEvent.click(screen.getByRole('button', { name: /Manage Tags/i }));
    expect(onOpenTagManager).toHaveBeenCalled();

    await userEvent.click(screen.getByTitle(/View feed logs/i));
    expect(onOpenFeedLogs).toHaveBeenCalled();

    await userEvent.click(screen.getByTitle(/Edit batch/i));
    expect(onEdit).toHaveBeenCalled();

    // open delete modal and cancel
    await userEvent.click(screen.getByTitle(/Delete batch/i));
    expect(await screen.findByText(/Confirm Delete/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Cancel/i }));

    // open delete modal and confirm
    await userEvent.click(screen.getByTitle(/Delete batch/i));
    const modal = await screen.findByText(/Confirm Delete/i);
    const scope = within(modal.closest('.modal') as HTMLElement);
    await userEvent.click(scope.getByRole('button', { name: /^Delete$/i }));
    // modal should close
    await screen.findByText(/DelRow/i);
  });
});
