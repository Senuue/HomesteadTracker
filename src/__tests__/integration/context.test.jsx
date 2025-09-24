import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ChickenProvider, useChicken } from '../../contexts/ChickenContext';

const wrapper = ({ children }) => <ChickenProvider>{children}</ChickenProvider>;

describe('ChickenContext integration', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('add/update/delete chicken through context', () => {
    const { result } = renderHook(() => useChicken(), { wrapper });

    // add
    act(() => {
      result.current.addChicken({ batchName: 'CTX', initialCount: 10, currentCount: 10 });
    });
    expect(result.current.chickens.length).toBe(1);

    const id = result.current.chickens[0].id;

    // update
    act(() => {
      result.current.updateChicken(id, { currentCount: 8 });
    });
    expect(result.current.getChickenById(id).currentCount).toBe(8);

    // feed log mutates aggregates and syncs state
    act(() => {
      result.current.addFeedLog(id, { pounds: 5, cost: 12 });
    });
    expect(result.current.getChickenById(id).feedUsage).toBe(5);
    expect(result.current.getChickenById(id).feedCost).toBe(12);

    // delete
    act(() => {
      result.current.deleteChicken(id);
    });
    expect(result.current.chickens.length).toBe(0);
  });

  it('tag management mutates batches and refreshes state', () => {
    const { result } = renderHook(() => useChicken(), { wrapper });

    act(() => {
      result.current.addChicken({ batchName: 'A', initialCount: 1, currentCount: 1, tags: ['spring'] });
      result.current.addChicken({ batchName: 'B', initialCount: 1, currentCount: 1, tags: ['broilers'] });
    });

    act(() => {
      result.current.renameTag('broilers', 'meat');
    });
    expect(Object.keys(result.current.getAllTags())).toContain('meat');

    act(() => {
      result.current.mergeTags(['spring', 'meat'], 'spring-meat');
    });
    expect(Object.keys(result.current.getAllTags())).toContain('spring-meat');

    act(() => {
      result.current.deleteTag('spring-meat');
    });
    expect(Object.keys(result.current.getAllTags())).not.toContain('spring-meat');
  });
});
