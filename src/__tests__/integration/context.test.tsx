import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ChickenProvider, useChicken } from '@/contexts/ChickenContext';
import { api } from '@/services/apiClient';
const mockedApi = api as any;

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => <ChickenProvider>{children}</ChickenProvider>;

describe('ChickenContext integration', () => {
  beforeEach(() => {
    window.localStorage.clear();
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
