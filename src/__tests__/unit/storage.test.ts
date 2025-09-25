import { describe, it, expect, beforeEach, vi } from 'vitest';
import { storage } from '@/utils/storage';

// Helper to seed localStorage directly
function seed(data: any) {
  localStorage.setItem('homestead-chicken-data', JSON.stringify(data));
}

describe('storage utils', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('currentCount falls back to initialCount when undefined, including zero', () => {
    // initial 0, current undefined -> both 0
    let c = storage.addChicken({ batchName: 'Zeroes', initialCount: 0 } as any);
    expect(c.initialCount).toBe(0);
    expect(c.currentCount).toBe(0);
    // initial 5, current undefined -> equals initial
    c = storage.addChicken({ batchName: 'Fallback', initialCount: 5 } as any);
    expect(c.currentCount).toBe(5);
  });

  it('getFeedLogs returns [] when stored feedLogs is not an array (malformed)', () => {
    // manually seed malformed record to bypass shape fix
    localStorage.setItem('homestead-chicken-data', JSON.stringify([
      { id: 'bad1', batchName: 'Bad', initialCount: 1, currentCount: 1, feedLogs: 'nope' },
    ]));
    expect(storage.getFeedLogs('bad1')).toEqual([]);
  });

  it('updateFeedLog with only cost set leaves pounds unchanged', () => {
    const c = storage.addChicken({ batchName: 'OnlyCost', initialCount: 1 } as any);
    const log = storage.addFeedLog(c.id, { pounds: 2, cost: 3 })!;
    const updated = storage.updateFeedLog(c.id, log.id, { cost: 10 })!;
    expect(updated.pounds).toBe(2);
    expect(updated.cost).toBe(10);
  });

  it('_recalcFeedAggregates handles logs with missing pounds/cost', () => {
    const c = storage.addChicken({ batchName: 'MissingFields', initialCount: 1 } as any);
    // push malformed logs by writing directly
    const rows = JSON.parse(localStorage.getItem('homestead-chicken-data') || '[]');
    const idx = rows.findIndex((r: any) => r.id === c.id);
    rows[idx].feedLogs = [{ id: 'l1' }, { id: 'l2', pounds: 1 }];
    localStorage.setItem('homestead-chicken-data', JSON.stringify(rows));
    // trigger recalc via addFeedLog
    storage.addFeedLog(c.id, { pounds: 0, cost: 0 });
    const got = storage.getChickenById(c.id)!;
    expect(got.feedUsage).toBeGreaterThanOrEqual(1); // at least the 1 from l2
    expect(got.feedCost).toBeGreaterThanOrEqual(0);
  });

  it('tag APIs tolerate non-array tags (malformed) by normalizing to []', () => {
    localStorage.setItem('homestead-chicken-data', JSON.stringify([
      { id: 't1', batchName: 'T1', initialCount: 1, currentCount: 1, tags: 'alpha' },
      { id: 't2', batchName: 'T2', initialCount: 1, currentCount: 1, tags: null },
    ]));
    // deleteTag should not throw and should result in a TagMap (likely empty)
    const tags = storage.deleteTag('alpha');
    expect(typeof tags).toBe('object');
  });

  it('deleteChicken returns false for missing id', () => {
    storage.addChicken({ batchName: 'X', initialCount: 1 } as any);
    const ok = storage.deleteChicken('does-not-exist');
    expect(ok).toBe(false);
  });

  it('deleteChicken returns true for existing id', () => {
    const c = storage.addChicken({ batchName: 'Y', initialCount: 2 } as any);
    const ok = storage.deleteChicken(c.id);
    expect(ok).toBe(true);
  });

  it('getFeedLogs returns empty array for unknown chicken', () => {
    const logs = storage.getFeedLogs('missing');
    expect(Array.isArray(logs)).toBe(true);
    expect(logs.length).toBe(0);
  });

  it('updateFeedLog returns null when log id not found', () => {
    const c = storage.addChicken({ batchName: 'Z', initialCount: 3 } as any);
    const res = storage.updateFeedLog(c.id, 'no-log', { pounds: 1 });
    expect(res).toBeNull();
  });

  it('getChickenById returns null for unknown id', () => {
    expect(storage.getChickenById('nope')).toBeNull();
  });

  it('addFeedLog returns null when chicken id not found', () => {
    const res = storage.addFeedLog('missing', { pounds: 1, cost: 1 });
    expect(res).toBeNull();
  });

  it('deleteFeedLog returns false when chicken id not found', () => {
    const ok = storage.deleteFeedLog('missing', 'log');
    expect(ok).toBe(false);
  });

  it('addChicken without aggregates does not seed feed log', () => {
    const c = storage.addChicken({ batchName: 'NoSeed', initialCount: 4 } as any);
    const logs = storage.getFeedLogs(c.id);
    expect(logs.length).toBe(0);
    const got = storage.getChickenById(c.id)!;
    expect(got.feedUsage).toBe(0);
    expect(got.feedCost).toBe(0);
  });

  it('updateChicken returns null when id not found', () => {
    const res = storage.updateChicken('no-id', { batchName: 'X' } as any);
    expect(res).toBeNull();
  });

  it('deleteFeedLog returns false when log id not found on existing chicken', () => {
    const c = storage.addChicken({ batchName: 'Logs', initialCount: 2 } as any);
    // no logs yet
    const ok = storage.deleteFeedLog(c.id, 'no-log');
    expect(ok).toBe(false);
  });

  it('status falls back to Culled when cullDate set and no explicit status (addChicken)', () => {
    const c = storage.addChicken({ batchName: 'Cull', initialCount: 1, cullDate: '2024-01-01' } as any);
    expect(c.status).toBe('Culled');
  });

  it('updateChicken preserves status when not provided; cullDate removal does not auto-flip', () => {
    const c = storage.addChicken({ batchName: 'Toggle', initialCount: 1 } as any);
    // no status in updates; set cullDate should imply Culled
    const updated = storage.updateChicken(c.id, { cullDate: '2024-01-02' } as any)!;
    expect(updated.status).toBe('Culled');
    // removing cullDate without explicit status keeps previous status
    const updated2 = storage.updateChicken(c.id, { cullDate: null } as any)!;
    expect(updated2.status).toBe('Culled');
  });

  it('deleteFeedLog returns true when an existing log is removed', () => {
    const c = storage.addChicken({ batchName: 'WithLog', initialCount: 2 } as any);
    const log = storage.addFeedLog(c.id, { pounds: 1, cost: 2 })!;
    expect(log.id).toBeTruthy();
    const ok = storage.deleteFeedLog(c.id, log.id);
    expect(ok).toBe(true);
  });

  it('_recalcFeedAggregates computes totals from logs', () => {
    const batch: any = {
      id: 'b1',
      feedLogs: [
        { id: 'l1', pounds: 5, cost: 12 },
        { id: 'l2', pounds: 3.5, cost: 7.25 },
      ],
      feedUsage: 0,
      feedCost: 0,
    };

    const result = (storage as any)._recalcFeedAggregates(batch);
    expect(result.feedUsage).toBe(8.5);
    expect(result.feedCost).toBe(19.25);
  });

  it('_recalcFeedAggregates keeps numeric defaults when no logs', () => {
    const batch: any = { id: 'b2', feedLogs: [], feedUsage: undefined, feedCost: undefined };
    const result = (storage as any)._recalcFeedAggregates(batch);
    expect(result.feedUsage).toBe(0);
    expect(result.feedCost).toBe(0);
  });

  it('getAllTags builds a sorted frequency map', () => {
    const original = storage.getChickens;
    (storage as any).getChickens = () => ([
      { id: '1', tags: ['spring', 'broilers'] },
      { id: '2', tags: ['spring', 'layers'] },
      { id: '3', tags: ['layers'] },
    ]);

    const map = storage.getAllTags();
    expect(map).toEqual({ broilers: 1, layers: 2, spring: 2 });

    (storage as any).getChickens = original;
  });

  it('normalizes tags from string and array and ignores invalid', () => {
    const a = storage.addChicken({ batchName: 'A', initialCount: 10, tags: 'x, y , , z' } as any);
    const b = storage.addChicken({ batchName: 'B', initialCount: 10, tags: [' a ', 'b', '', 'c'] } as any);

    expect(a.tags).toEqual(['x', 'y', 'z']);
    expect(b.tags).toEqual(['a', 'b', 'c']);
  });

  it('seeds a feed log when feedCost/feedUsage provided on add and recalculates aggregates', () => {
    const c = storage.addChicken({ batchName: 'C', initialCount: 10, feedCost: 12.5, feedUsage: 3.3 } as any);
    const logs = storage.getFeedLogs(c.id);
    expect(logs.length).toBe(1);
    expect(logs[0].cost).toBe(12.5);
    expect(logs[0].pounds).toBe(3.3);
    const got = storage.getChickenById(c.id)!;
    expect(got.feedCost).toBe(12.5);
    expect(got.feedUsage).toBe(3.3);
  });

  it('add/update/delete feed logs maintain aggregates', () => {
    const c = storage.addChicken({ batchName: 'D', initialCount: 5 } as any);
    const l1 = storage.addFeedLog(c.id, { pounds: 2, cost: 4 })!;
    const l2 = storage.addFeedLog(c.id, { pounds: 1.5, cost: 2 })!;

    let got = storage.getChickenById(c.id)!;
    expect(got.feedUsage).toBeCloseTo(3.5);
    expect(got.feedCost).toBeCloseTo(6);

    storage.updateFeedLog(c.id, l1.id, { pounds: 2.5 });
    got = storage.getChickenById(c.id)!;
    expect(got.feedUsage).toBeCloseTo(4.0);

    storage.deleteFeedLog(c.id, l2.id);
    got = storage.getChickenById(c.id)!;
    expect(got.feedUsage).toBeCloseTo(2.5);
    expect(storage.getFeedLogs(c.id).length).toBe(1);
  });

  it('updateChicken merges fields, preserves status when not explicitly set, and toggles by cullDate', () => {
    const c = storage.addChicken({ batchName: 'E', initialCount: 3 } as any);
    const updated1 = storage.updateChicken(c.id, { currentCount: 2 } as any)!;
    expect(updated1.status).toBe('Active');

    const updated2 = storage.updateChicken(c.id, { cullDate: '2024-01-01' } as any)!;
    expect(updated2.status).toBe('Culled');
  });

  it('tag management: getAllTags, renameTag, deleteTag, mergeTags', () => {
    storage.addChicken({ batchName: 'A', initialCount: 1, tags: ['red', 'blue'] } as any);
    storage.addChicken({ batchName: 'B', initialCount: 1, tags: ['blue', 'green'] } as any);

    let tags = storage.getAllTags();
    expect(tags).toMatchObject({ blue: 2, green: 1, red: 1 });

    tags = storage.renameTag('blue', 'cyan');
    expect(tags).toMatchObject({ cyan: 2, green: 1, red: 1 });

    tags = storage.deleteTag('red');
    expect(tags.red).toBeUndefined();

    tags = storage.mergeTags(['green', 'cyan'], 'mixed');
    expect(tags.mixed).toBeDefined();
  });

  it('tag APIs handle invalid inputs and no-ops', () => {
    // seed
    storage.addChicken({ batchName: 'T', initialCount: 1, tags: ['one', 'two'] } as any);

    // renameTag with empty newTag
    let before = storage.getAllTags();
    let after = storage.renameTag('one', '');
    expect(after).toEqual(before);

    // renameTag old===new
    before = storage.getAllTags();
    after = storage.renameTag('two', 'two');
    expect(after).toEqual(before);

    // deleteTag with empty
    before = storage.getAllTags();
    after = storage.deleteTag('');
    expect(after).toEqual(before);

    // mergeTags with <2 list
    before = storage.getAllTags();
    after = storage.mergeTags(['one'], 'merged');
    expect(after).toEqual(before);

    // mergeTags with blank newTag
    before = storage.getAllTags();
    after = storage.mergeTags(['one', 'two'], '');
    expect(after).toEqual(before);
  });

  it('gracefully handles malformed persisted data and wrong shapes', () => {
    // malformed JSON -> read() returns [] without throwing
    localStorage.setItem('homestead-chicken-data', '{not json');
    expect(storage.getChickens()).toEqual([]);

    // wrong shapes
    seed([{ id: 1, batchName: 2, initialCount: '3', feedLogs: 'nope' }]);
    const rows = storage.getChickens();
    expect(rows[0].id).toBe('1');
    expect(rows[0].batchName).toBe('2');
    expect(rows[0].initialCount).toBe(3);
    expect(Array.isArray((rows as any)[0].feedLogs)).toBe(true);
  });

  it('saveChickens returns false when localStorage.setItem throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const ok = storage.saveChickens([] as any);
    expect(ok).toBe(false);
    spy.mockRestore();
  });

  it('getChickens returns [] when localStorage.getItem throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('fail');
    });
    const rows = storage.getChickens();
    expect(rows).toEqual([]);
    spy.mockRestore();
  });
});
