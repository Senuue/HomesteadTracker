import { describe, it, expect } from 'vitest';
import { storage } from '../../utils/storage';

// Unit tests focused on the pure utility behavior inside storage
// These do not rely on localStorage persistence; they test pure helpers and
// deterministic outputs from in-memory objects.

describe('storage utils (pure)', () => {
  it('_recalcFeedAggregates computes totals from logs', () => {
    const batch = {
      id: 'b1',
      feedLogs: [
        { id: 'l1', pounds: 5, cost: 12 },
        { id: 'l2', pounds: 3.5, cost: 7.25 },
      ],
      feedUsage: 0,
      feedCost: 0,
    };

    const result = storage._recalcFeedAggregates(batch);
    expect(result.feedUsage).toBe(8.5);
    expect(result.feedCost).toBe(19.25);
  });

  it('getAllTags builds a sorted frequency map', () => {
    // Stub storage.getChickens to avoid localStorage
    const original = storage.getChickens;
    storage.getChickens = () => ([
      { id: '1', tags: ['spring', 'broilers'] },
      { id: '2', tags: ['spring', 'layers'] },
      { id: '3', tags: ['layers'] },
    ]);

    const map = storage.getAllTags();
    expect(map).toEqual({ broilers: 1, layers: 2, spring: 2 });

    // restore
    storage.getChickens = original;
  });

  it('_recalcFeedAggregates keeps numeric defaults when no logs', () => {
    const batch = { id: 'b2', feedLogs: [], feedUsage: undefined, feedCost: undefined };
    const result = storage._recalcFeedAggregates(batch);
    expect(result.feedUsage).toBe(0);
    expect(result.feedCost).toBe(0);
  });
});
