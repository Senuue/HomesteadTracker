// Local storage utilities for chicken tracking data
const STORAGE_KEY = 'homestead-chicken-data';

export const storage = {
  // Get all chicken records
  getChickens: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      const chickens = data ? JSON.parse(data) : [];
      // Ensure structure compatibility and defaults
      return chickens.map((c) => ({
        ...c,
        feedLogs: Array.isArray(c.feedLogs) ? c.feedLogs : [],
        // status: 'Active' | 'Culled'
        status: c.status || (c.cullDate ? 'Culled' : 'Active'),
        // tags: array of strings
        tags: Array.isArray(c.tags) ? c.tags : (typeof c.tags === 'string' ? c.tags.split(',').map(t => t.trim()).filter(Boolean) : []),
      }));
    } catch (error) {
      console.error('Error reading chicken data:', error);
      return [];
    }
  },

  // Save chicken records
  saveChickens: (chickens) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chickens));
      return true;
    } catch (error) {
      console.error('Error saving chicken data:', error);
      return false;
    }
  },

  // Add a new chicken record
  addChicken: (chicken) => {
    const chickens = storage.getChickens();
    const newChicken = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      feedLogs: [],
      ...chicken
    };
    // Normalize tags
    if (!Array.isArray(newChicken.tags)) {
      if (typeof newChicken.tags === 'string') {
        newChicken.tags = newChicken.tags.split(',').map(t => t.trim()).filter(Boolean);
      } else {
        newChicken.tags = [];
      }
    }
    // Default status
    if (!newChicken.status) {
      newChicken.status = newChicken.cullDate ? 'Culled' : 'Active';
    }
    // If feedCost/feedUsage provided directly, seed a feed log entry for traceability
    if ((newChicken.feedCost && newChicken.feedCost > 0) || (newChicken.feedUsage && newChicken.feedUsage > 0)) {
      newChicken.feedLogs.push({
        id: `${Date.now().toString()}-seed`,
        date: new Date().toISOString().slice(0, 10),
        pounds: Number(newChicken.feedUsage || 0),
        cost: Number(newChicken.feedCost || 0),
        notes: 'Initial aggregate feed values',
        createdAt: new Date().toISOString(),
      });
    }
    // Recalculate aggregates from logs to keep totals consistent
    storage._recalcFeedAggregates(newChicken);
    chickens.push(newChicken);
    storage.saveChickens(chickens);
    return newChicken;
  },

  // Update an existing chicken record
  updateChicken: (id, updates) => {
    const chickens = storage.getChickens();
    const index = chickens.findIndex(chicken => chicken.id === id);
    if (index !== -1) {
      const merged = { ...chickens[index], ...updates, updatedAt: new Date().toISOString() };
      // Ensure feedLogs exists
      merged.feedLogs = Array.isArray(merged.feedLogs) ? merged.feedLogs : [];
      // Normalize tags
      if (!Array.isArray(merged.tags)) {
        if (typeof merged.tags === 'string') {
          merged.tags = merged.tags.split(',').map(t => t.trim()).filter(Boolean);
        } else {
          merged.tags = [];
        }
      }
      // Keep status consistent with cullDate if not explicitly set in updates
      if (!('status' in updates)) {
        merged.status = merged.cullDate ? 'Culled' : (merged.status || 'Active');
      }
      // If user directly edits aggregate fields, keep them but also recalc if logs exist
      storage._recalcFeedAggregates(merged);
      chickens[index] = merged;
      storage.saveChickens(chickens);
      return chickens[index];
    }
    return null;
  },

  // Delete a chicken record
  deleteChicken: (id) => {
    const chickens = storage.getChickens();
    const filteredChickens = chickens.filter(chicken => chicken.id !== id);
    storage.saveChickens(filteredChickens);
    return filteredChickens.length < chickens.length;
  },

  // Get chicken by ID
  getChickenById: (id) => {
    const chickens = storage.getChickens();
    return chickens.find(chicken => chicken.id === id) || null;
  },

  // ----------------------
  // Feed Log API
  // ----------------------

  getFeedLogs: (chickenId) => {
    const chicken = storage.getChickenById(chickenId);
    return chicken ? (Array.isArray(chicken.feedLogs) ? chicken.feedLogs : []) : [];
  },

  addFeedLog: (chickenId, entry) => {
    const chickens = storage.getChickens();
    const index = chickens.findIndex((c) => c.id === chickenId);
    if (index === -1) return null;
    const log = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date: entry.date || new Date().toISOString().slice(0, 10),
      pounds: Number(entry.pounds || 0),
      cost: Number(entry.cost || 0),
      notes: entry.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    chickens[index].feedLogs = Array.isArray(chickens[index].feedLogs) ? chickens[index].feedLogs : [];
    chickens[index].feedLogs.push(log);
    storage._recalcFeedAggregates(chickens[index]);
    storage.saveChickens(chickens);
    return log;
  },

  updateFeedLog: (chickenId, logId, updates) => {
    const chickens = storage.getChickens();
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
    };
    chickens[cIdx].feedLogs = logs;
    storage._recalcFeedAggregates(chickens[cIdx]);
    storage.saveChickens(chickens);
    return logs[lIdx];
  },

  deleteFeedLog: (chickenId, logId) => {
    const chickens = storage.getChickens();
    const cIdx = chickens.findIndex((c) => c.id === chickenId);
    if (cIdx === -1) return false;
    const before = chickens[cIdx].feedLogs ? chickens[cIdx].feedLogs.length : 0;
    chickens[cIdx].feedLogs = (chickens[cIdx].feedLogs || []).filter((l) => l.id !== logId);
    storage._recalcFeedAggregates(chickens[cIdx]);
    storage.saveChickens(chickens);
    return (chickens[cIdx].feedLogs || []).length < before;
  },

  // Helper: recompute aggregate feedUsage/feedCost from logs for a batch
  _recalcFeedAggregates: (batch) => {
    const logs = Array.isArray(batch.feedLogs) ? batch.feedLogs : [];
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
      // Keep existing aggregate fields if no logs
      batch.feedUsage = Number(batch.feedUsage || 0);
      batch.feedCost = Number(batch.feedCost || 0);
    }
    return batch;
  },

  // ----------------------
  // Tag Management API
  // ----------------------

  getAllTags: () => {
    const chickens = storage.getChickens();
    const map = new Map();
    chickens.forEach((c) => {
      (Array.isArray(c.tags) ? c.tags : []).forEach((t) => {
        const key = String(t).trim();
        if (!key) return;
        map.set(key, (map.get(key) || 0) + 1);
      });
    });
    return Object.fromEntries(Array.from(map.entries()).sort((a,b) => a[0].localeCompare(b[0])));
  },

  renameTag: (oldTag, newTag) => {
    if (!oldTag || !newTag) return storage.getAllTags();
    const oldKey = String(oldTag).trim();
    const newKey = String(newTag).trim();
    if (!oldKey || !newKey || oldKey === newKey) return storage.getAllTags();
    const chickens = storage.getChickens();
    chickens.forEach((c) => {
      if (!Array.isArray(c.tags)) c.tags = [];
      if (c.tags.includes(oldKey)) {
        c.tags = Array.from(new Set(c.tags.map((t) => (t === oldKey ? newKey : t))));
      }
    });
    storage.saveChickens(chickens);
    return storage.getAllTags();
  },

  deleteTag: (tag) => {
    const key = String(tag || '').trim();
    if (!key) return storage.getAllTags();
    const chickens = storage.getChickens();
    chickens.forEach((c) => {
      if (!Array.isArray(c.tags)) c.tags = [];
      c.tags = c.tags.filter((t) => t !== key);
    });
    storage.saveChickens(chickens);
    return storage.getAllTags();
  },

  mergeTags: (tags, newTag) => {
    const list = (Array.isArray(tags) ? tags : []).map((t) => String(t).trim()).filter(Boolean);
    const newKey = String(newTag || '').trim();
    if (list.length < 2 || !newKey) return storage.getAllTags();
    const chickens = storage.getChickens();
    chickens.forEach((c) => {
      if (!Array.isArray(c.tags)) c.tags = [];
      let changed = false;
      const set = new Set(c.tags);
      let hasAny = false;
      list.forEach((t) => { if (set.has(t)) { set.delete(t); hasAny = true; changed = true; }});
      if (hasAny) set.add(newKey);
      if (changed) c.tags = Array.from(set);
    });
    storage.saveChickens(chickens);
    return storage.getAllTags();
  },
};
