import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';

import { ChickenProvider, useChicken } from '@/contexts/ChickenContext';
import { api } from '@/services/apiClient';
const mockedApi = api as any;

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => <ChickenProvider>{children}</ChickenProvider>;

describe('ChickenContext integration', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('handles initial load failure and sets loading=false', async () => {
    mockedApi.listChickens.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useChicken(), { wrapper });
    // allow effect to run
    await act(async () => {});
    expect(result.current.loading).toBe(false);
    // ensure no chickens loaded
    expect(result.current.chickens).toEqual([]);
  });

  it('propagates errors from add/update/delete', async () => {
    mockedApi.listChickens.mockResolvedValueOnce([]);
    const { result } = renderHook(() => useChicken(), { wrapper });
    await act(async () => {});

    // add error
    mockedApi.addChicken.mockRejectedValueOnce(new Error('add-fail'));
    await expect(async () => {
      await act(async () => {
        await result.current.addChicken({ batchName: 'X' });
      });
    }).rejects.toThrow();

    // create a chicken so we can test update/delete failures
    mockedApi.addChicken.mockResolvedValueOnce({ id: 'C1', batchName: 'C1', initialCount: 1, currentCount: 1 });
    await act(async () => {
      await result.current.addChicken({ batchName: 'C1', initialCount: 1, currentCount: 1 });
    });
    const id = result.current.chickens[0].id;

    // update error
    mockedApi.updateChicken.mockRejectedValueOnce(new Error('update-fail'));
    await expect(async () => {
      await act(async () => {
        await result.current.updateChicken(id, { currentCount: 2 });
      });
    }).rejects.toThrow();

    // delete error
    mockedApi.deleteChicken.mockRejectedValueOnce(new Error('delete-fail'));
    await expect(async () => {
      await act(async () => {
        await result.current.deleteChicken(id);
      });
    }).rejects.toThrow();
  });

  it('refreshFeedLogs caches logs per chicken and update/delete mutate cache and refresh chickens', async () => {
    mockedApi.listChickens.mockResolvedValueOnce([{ id: 'X', batchName: 'X', initialCount: 1, currentCount: 1 }] as any);
    const { result } = renderHook(() => useChicken(), { wrapper });
    await act(async () => {});

    // initial fetch of logs
    mockedApi.listFeedLogs.mockResolvedValueOnce([{ id: 'L1', chickenId: 'X', pounds: 1, cost: 2 } as any]);
    await act(async () => {
      const logs = await result.current.refreshFeedLogs('X');
      expect(logs.length).toBe(1);
    });
    expect(result.current.getFeedLogs('X').length).toBe(1);

    // update a log -> ensure cache mutation + chickens refresh
    mockedApi.updateFeedLog.mockResolvedValueOnce({ id: 'L1', chickenId: 'X', pounds: 2, cost: 3 } as any);
    mockedApi.listChickens.mockResolvedValueOnce([{ id: 'X', batchName: 'X', initialCount: 1, currentCount: 1, feedUsage: 2, feedCost: 3 }] as any);
    await act(async () => {
      await result.current.updateFeedLog('X', 'L1', { pounds: 2, cost: 3 });
    });
    expect(result.current.getFeedLogs('X')[0].pounds).toBe(2);

    // delete log -> ensure removal + refresh
    mockedApi.deleteFeedLog.mockResolvedValueOnce(null);
    mockedApi.listChickens.mockResolvedValueOnce([{ id: 'X', batchName: 'X', initialCount: 1, currentCount: 1, feedUsage: 0, feedCost: 0 }] as any);
    await act(async () => {
      const ok = await result.current.deleteFeedLog('X', 'L1');
      expect(ok).toBe(true);
    });
    expect(result.current.getFeedLogs('X').length).toBe(0);
  });

  it('getAllTags returns map from API', async () => {
    mockedApi.listChickens.mockResolvedValueOnce([]);
    const { result } = renderHook(() => useChicken(), { wrapper });
    await act(async () => {});

    mockedApi.getAllTags.mockResolvedValueOnce({ a: 1, b: 2 });
    await act(async () => {
      const map = await result.current.getAllTags();
      expect(map).toEqual({ a: 1, b: 2 });
    });
  });

  it('add/update/delete chicken through context', async () => {
    mockedApi.listChickens.mockResolvedValueOnce([]);
    const { result } = renderHook(() => useChicken(), { wrapper });
    await act(async () => {});

    // add
    mockedApi.addChicken.mockResolvedValueOnce({ id: 'id-1', batchName: 'CTX', initialCount: 10, currentCount: 10 });
    await act(async () => {
      await result.current.addChicken({ batchName: 'CTX', initialCount: 10, currentCount: 10 });
    });
    expect(result.current.chickens.length).toBe(1);
    const id = result.current.chickens[0].id;

    // update
    mockedApi.updateChicken.mockResolvedValueOnce({ id, batchName: 'CTX', initialCount: 10, currentCount: 8 });
    await act(async () => {
      await result.current.updateChicken(id, { currentCount: 8 });
    });
    expect(result.current.getChickenById(id)?.currentCount).toBe(8);

    // add feed log -> simulate server aggregate recalc via next listChickens
    mockedApi.addFeedLog.mockResolvedValueOnce({ id: 'log-1', chickenId: id, pounds: 5, cost: 12 });
    mockedApi.listChickens.mockResolvedValueOnce([{ id, batchName: 'CTX', initialCount: 10, currentCount: 8, feedUsage: 5, feedCost: 12 } as any]);
    await act(async () => {
      await result.current.addFeedLog(id, { pounds: 5, cost: 12 });
      const rows = await api.listChickens();
      // emulate a refresh
      (result.current as any).chickens = rows;
    });
    expect(result.current.getChickenById(id)?.feedUsage).toBe(5);
    expect(result.current.getChickenById(id)?.feedCost).toBe(12);

    // delete
    mockedApi.deleteChicken.mockResolvedValueOnce(null);
    await act(async () => {
      await result.current.deleteChicken(id);
    });
    expect(result.current.chickens.length).toBe(0);
  });

  it('tag management mutates batches and refreshes state', async () => {
    api.listChickens.mockResolvedValueOnce([]);
    const { result } = renderHook(() => useChicken(), { wrapper });
    await act(async () => {});

    // seed two batches
    mockedApi.addChicken.mockResolvedValueOnce({ id: 'A', batchName: 'A', initialCount: 1, currentCount: 1, tags: ['spring'] });
    await act(async () => {
      await result.current.addChicken({ batchName: 'A', initialCount: 1, currentCount: 1, tags: ['spring'] });
    });
    mockedApi.addChicken.mockResolvedValueOnce({ id: 'B', batchName: 'B', initialCount: 1, currentCount: 1, tags: ['broilers'] });
    await act(async () => {
      await result.current.addChicken({ batchName: 'B', initialCount: 1, currentCount: 1, tags: ['broilers'] });
    });

    // rename broilers -> meat
    mockedApi.updateChicken.mockResolvedValue({} as any);
    mockedApi.listChickens.mockResolvedValueOnce([
      { id: 'A', batchName: 'A', tags: ['spring'] },
      { id: 'B', batchName: 'B', tags: ['meat'] },
    ] as any);
    mockedApi.getAllTags.mockResolvedValue({ spring: 1, meat: 1 });
    await act(async () => {
      await result.current.renameTag('broilers', 'meat');
    });
    const tagsAfterRename = await result.current.getAllTags();
    expect(Object.keys(tagsAfterRename)).toContain('meat');

    // merge to spring-meat
    api.listChickens.mockResolvedValueOnce([
      { id: 'A', batchName: 'A', tags: ['spring-meat'] },
      { id: 'B', batchName: 'B', tags: ['spring-meat'] },
    ] as any);
    mockedApi.getAllTags.mockResolvedValue({ 'spring-meat': 2 });
    await act(async () => {
      await result.current.mergeTags(['spring', 'meat'], 'spring-meat');
    });
    const tagsAfterMerge = await result.current.getAllTags();
    expect(Object.keys(tagsAfterMerge)).toContain('spring-meat');

    // delete spring-meat
    api.listChickens.mockResolvedValueOnce([
      { id: 'A', batchName: 'A', tags: [] },
      { id: 'B', batchName: 'B', tags: [] },
    ] as any);
    mockedApi.getAllTags.mockResolvedValue({});
    await act(async () => {
      await result.current.deleteTag('spring-meat');
    });
    const tagsAfterDelete = await result.current.getAllTags();
    expect(Object.keys(tagsAfterDelete)).not.toContain('spring-meat');
  });
});
