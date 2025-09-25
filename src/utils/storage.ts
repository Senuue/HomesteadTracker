import type { Chicken, FeedLog, TagMap } from '@/types';

// Local storage utilities for chicken tracking data
const STORAGE_KEY = 'homestead-chicken-data';

type PartialChicken = Partial<Chicken> & { id?: string };

type InternalChicken = Chicken & { feedLogs: FeedLog[] };

function read(): any[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error reading chicken data:', e);
    return [];
  }
}

function write(rows: any[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
    return true;
  } catch (e) {
    console.error('Error saving chicken data:', e);
    return false;
  }
}

function normalizeTags(tags: unknown): string[] {
  if (Array.isArray(tags)) return tags.map((t) => String(t).trim()).filter(Boolean);
  if (typeof tags === 'string') return tags.split(',').map((t) => t.trim()).filter(Boolean);
  return [];
}

function ensureChickenShape(input: any): InternalChicken {
  const feedLogs: FeedLog[] = Array.isArray(input.feedLogs) ? input.feedLogs : [];
  const status = (input.status as Chicken['status']) || (input.cullDate ? 'Culled' : 'Active');
  return {
    id: String(input.id),
    batchName: String(input.batchName),
    initialCount: Number(input.initialCount || 0),
    currentCount: Number(input.currentCount ?? input.initialCount ?? 0),
    status,
    tags: normalizeTags(input.tags),
    feedCost: Number(input.feedCost || 0),
    feedUsage: Number(input.feedUsage || 0),
    chickOrderDate: input.chickOrderDate ?? null,
    chickDeliveryDate: input.chickDeliveryDate ?? null,
    cullDate: input.cullDate ?? null,
    notes: input.notes ?? null,
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: input.updatedAt,
    feedLogs,
  };
}

export const storage = {
  // Get all chicken records
  getChickens(): InternalChicken[] {
    const chickens = read();
    return chickens.map(ensureChickenShape);
  },

  // Save chicken records
  saveChickens(chickens: InternalChicken[]): boolean {
    return write(chickens);
  },

  // Add a new chicken record
  addChicken(chicken: PartialChicken): InternalChicken {
    const chickens = this.getChickens();
    const now = new Date().toISOString();
    const newChicken: any = {
      id: Date.now().toString(),
      createdAt: now,
      feedLogs: [],
      ...chicken,
    };

    // Normalize tags and status
    newChicken.tags = normalizeTags(newChicken.tags);
    if (!newChicken.status) newChicken.status = newChicken.cullDate ? 'Culled' : 'Active';

    // Seed a feed log if aggregate values are directly provided
    if ((newChicken.feedCost && newChicken.feedCost > 0) || (newChicken.feedUsage && newChicken.feedUsage > 0)) {
      (newChicken.feedLogs as FeedLog[]).push({
        id: `${Date.now().toString()}-seed`,
        date: now.slice(0, 10),
        pounds: Number(newChicken.feedUsage || 0),
        cost: Number(newChicken.feedCost || 0),
        notes: 'Initial aggregate feed values',
        createdAt: now,
      });
    }

    // Recalculate aggregates
    this._recalcFeedAggregates(newChicken);
    chickens.push(ensureChickenShape(newChicken));
    this.saveChickens(chickens);
    return chickens[chickens.length - 1];
  },

  // Update an existing chicken record
  updateChicken(id: string, updates: PartialChicken): InternalChicken | null {
    const chickens = this.getChickens();
    const index = chickens.findIndex((c) => c.id === id);
    if (index === -1) return null;

    const merged: any = {
      ...chickens[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    merged.feedLogs = Array.isArray(merged.feedLogs) ? merged.feedLogs : [];
    merged.tags = normalizeTags(merged.tags);

    // Keep status consistent with cullDate if not explicitly set
    if (!('status' in updates)) {
      merged.status = merged.cullDate ? 'Culled' : (merged.status || 'Active');
    }

    this._recalcFeedAggregates(merged);
    chickens[index] = ensureChickenShape(merged);
    this.saveChickens(chickens);
    return chickens[index];
  },

  // Delete a chicken record
  deleteChicken(id: string): boolean {
    const chickens = this.getChickens();
    const filtered = chickens.filter((c) => c.id !== id);
    this.saveChickens(filtered);
    return filtered.length < chickens.length;
  },

  // Get chicken by ID
  getChickenById(id: string): InternalChicken | null {
    const chickens = this.getChickens();
    return chickens.find((c) => c.id === id) || null;
  },

  // Feed Log API
  getFeedLogs(chickenId: string): FeedLog[] {
    const chicken = this.getChickenById(chickenId);
    return chicken ? (Array.isArray(chicken.feedLogs) ? chicken.feedLogs : []) : [];
  },

  addFeedLog(chickenId: string, entry: Partial<FeedLog>): FeedLog | null {
    const chickens = this.getChickens();
    const index = chickens.findIndex((c) => c.id === chickenId);
    if (index === -1) return null;

    const now = new Date().toISOString();
    const log: FeedLog = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date: entry.date || now.slice(0, 10),
      pounds: Number(entry.pounds || 0),
      cost: Number(entry.cost || 0),
      notes: entry.notes || '',
      createdAt: now,
      updatedAt: now,
    };

    const current = chickens[index];
    current.feedLogs = Array.isArray(current.feedLogs) ? current.feedLogs : [];
    current.feedLogs.push(log);
    this._recalcFeedAggregates(current);
    this.saveChickens(chickens);
    return log;
  },

  updateFeedLog(chickenId: string, logId: string, updates: Partial<FeedLog>): FeedLog | null {
    const chickens = this.getChickens();
    const cIdx = chickens.findIndex((c) => c.id === chickenId);
    if (cIdx === -1) return null;
    const logs = Array.isArray(chickens[cIdx].feedLogs) ? chickens[cIdx].feedLogs : [];
    const lIdx = logs.findIndex((l) => l.id === logId);
    if (lIdx === -1) return null;

    logs[lIdx] = {
      ...logs[lIdx],
      ...updates,
      pounds: updates.pounds !== undefined ? Number(updates.pounds) : logs[lIdx].pounds,
      cost: updates.cost !== undefined ? Number(updates.cost) : logs[lIdx].cost,
      updatedAt: new Date().toISOString(),
    } as FeedLog;

    chickens[cIdx].feedLogs = logs;
    this._recalcFeedAggregates(chickens[cIdx]);
    this.saveChickens(chickens);
    return logs[lIdx];
  },

  deleteFeedLog(chickenId: string, logId: string): boolean {
    const chickens = this.getChickens();
    const cIdx = chickens.findIndex((c) => c.id === chickenId);
    if (cIdx === -1) return false;
    const before = chickens[cIdx].feedLogs ? chickens[cIdx].feedLogs.length : 0;
    chickens[cIdx].feedLogs = (chickens[cIdx].feedLogs || []).filter((l) => l.id !== logId);
    this._recalcFeedAggregates(chickens[cIdx]);
    this.saveChickens(chickens);
    return (chickens[cIdx].feedLogs || []).length < before;
  },

  // Helper: recompute aggregate feedUsage/feedCost from logs for a batch
  _recalcFeedAggregates(batch: any): any {
    const logs: FeedLog[] = Array.isArray(batch.feedLogs) ? batch.feedLogs : [];
    if (logs.length > 0) {
      const totals = logs.reduce(
        (acc, l) => {
          acc.usage += Number(l.pounds || 0);
          acc.cost += Number(l.cost || 0);
          return acc;
        },
        { usage: 0, cost: 0 }
      );
      batch.feedUsage = totals.usage;
      batch.feedCost = totals.cost;
    } else {
      batch.feedUsage = Number(batch.feedUsage || 0);
      batch.feedCost = Number(batch.feedCost || 0);
    }
    return batch;
  },

  // Tag Management API
  getAllTags(): TagMap {
    const chickens = this.getChickens();
    const map = new Map<string, number>();
    chickens.forEach((c) => {
      (Array.isArray(c.tags) ? c.tags : []).forEach((t) => {
        const key = String(t).trim();
        if (!key) return;
        map.set(key, (map.get(key) || 0) + 1);
      });
    });
    return Object.fromEntries(Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])));
  },

  renameTag(oldTag: string, newTag: string): TagMap {
    if (!oldTag || !newTag) return this.getAllTags();
    const oldKey = String(oldTag).trim();
    const newKey = String(newTag).trim();
    if (!oldKey || !newKey || oldKey === newKey) return this.getAllTags();
    const chickens = this.getChickens();
    chickens.forEach((c) => {
      if (!Array.isArray(c.tags)) c.tags = [];
      if (c.tags.includes(oldKey)) {
        c.tags = Array.from(new Set(c.tags.map((t) => (t === oldKey ? newKey : t))));
      }
    });
    this.saveChickens(chickens);
    return this.getAllTags();
  },

  deleteTag(tag: string): TagMap {
    const key = String(tag || '').trim();
    if (!key) return this.getAllTags();
    const chickens = this.getChickens();
    chickens.forEach((c) => {
      if (!Array.isArray(c.tags)) c.tags = [];
      c.tags = c.tags.filter((t) => t !== key);
    });
    this.saveChickens(chickens);
    return this.getAllTags();
  },

  mergeTags(tags: string[], newTag: string): TagMap {
    const list = (Array.isArray(tags) ? tags : []).map((t) => String(t).trim()).filter(Boolean) as string[];
    const newKey = String(newTag || '').trim();
    if (list.length < 2 || !newKey) return this.getAllTags();
    const chickens = this.getChickens();
    chickens.forEach((c) => {
      if (!Array.isArray(c.tags)) c.tags = [];
      let changed = false;
      const set = new Set(c.tags);
      let hasAny = false;
      list.forEach((t) => {
        if (set.has(t)) {
          set.delete(t);
          hasAny = true;
          changed = true;
        }
      });
      if (hasAny) set.add(newKey);
      if (changed) c.tags = Array.from(set);
    });
    this.saveChickens(chickens);
    return this.getAllTags();
  },
};

export type { InternalChicken };
