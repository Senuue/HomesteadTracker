import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from '../../utils/storage';

describe('storage: chickens + feed logs + tags', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('adds a chicken and retrieves it', () => {
    const created = storage.addChicken({
      batchName: 'Batch A',
      initialCount: 10,
      currentCount: 10,
      feedCost: 0,
      feedUsage: 0,
      status: 'Active',
      tags: ['spring']
    });
    expect(created.id).toBeDefined();

    const all = storage.getChickens();
    expect(all).toHaveLength(1);
    expect(all[0].batchName).toBe('Batch A');
    expect(all[0].status).toBe('Active');
    expect(all[0].tags).toEqual(['spring']);
  });

  it('manages feed logs and recalculates aggregates', () => {
    const { id } = storage.addChicken({ batchName: 'FeedTest', initialCount: 5, currentCount: 5 });
    storage.addFeedLog(id, { date: '2024-04-01', pounds: 10, cost: 20 });
    storage.addFeedLog(id, { date: '2024-04-02', pounds: 5, cost: 9 });

    const c = storage.getChickenById(id);
    expect(c.feedLogs).toHaveLength(2);
    expect(c.feedUsage).toBe(15);
    expect(c.feedCost).toBe(29);

    // update a feed log
    const first = c.feedLogs[0];
    storage.updateFeedLog(id, first.id, { pounds: 12, cost: 22 });
    const updated = storage.getChickenById(id);
    expect(updated.feedUsage).toBe(17);
    expect(updated.feedCost).toBe(31);

    // delete a feed log
    const second = updated.feedLogs[1];
    storage.deleteFeedLog(id, second.id);
    const afterDelete = storage.getChickenById(id);
    expect(afterDelete.feedLogs).toHaveLength(1);
    expect(afterDelete.feedUsage).toBe(12);
    expect(afterDelete.feedCost).toBe(22);
  });

  it('supports tags: rename, delete, merge', () => {
    window.localStorage.clear();
    const a = storage.addChicken({ batchName: 'A', initialCount: 1, currentCount: 1, tags: ['spring', 'broilers'] });
    const b = storage.addChicken({ batchName: 'B', initialCount: 1, currentCount: 1, tags: ['spring', 'hatchery'] });

    let allTags = storage.getAllTags();
    expect(allTags).toHaveProperty('spring');

    // rename
    storage.renameTag('broilers', 'meat');
    allTags = storage.getAllTags();
    expect(allTags).toHaveProperty('meat');
    expect(storage.getChickenById(a.id).tags).toContain('meat');

    // merge
    storage.mergeTags(['spring', 'hatchery'], 'spring-2024');
    allTags = storage.getAllTags();
    expect(allTags).toHaveProperty('spring-2024');
    expect(storage.getChickenById(b.id).tags).toContain('spring-2024');

    // delete
    storage.deleteTag('spring-2024');
    expect(storage.getAllTags()).not.toHaveProperty('spring-2024');
  });
});
