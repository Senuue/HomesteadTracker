import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/apiClient';

const ChickenContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useChicken = () => {
  const context = useContext(ChickenContext);
  if (!context) {
    throw new Error('useChicken must be used within a ChickenProvider');
  }
  return context;
};

export const ChickenProvider = ({ children }) => {
  const [chickens, setChickens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedLogsByChicken, setFeedLogsByChicken] = useState({});

  const refreshChickens = async () => {
    try {
      const rows = await api.listChickens();
      setChickens(rows);
    } catch (error) {
      console.warn('Failed to refresh chickens:', error);
    }
  };

  // Load chickens from API on mount
  useEffect(() => {
    const loadChickens = async () => {
      setLoading(true);
      try {
        const rows = await api.listChickens();
        setChickens(rows);
      } catch (error) {
        console.error('Error loading chickens:', error);
      } finally {
        setLoading(false);
      }
    };

    loadChickens();
  }, []);

  const addChicken = async (chickenData) => {
    try {
      const created = await api.addChicken(chickenData);
      setChickens(prev => [created, ...prev]);
      return created;
    } catch (error) {
      console.error('Error adding chicken:', error);
      throw error;
    }
  };

  const updateChicken = async (id, updates) => {
    try {
      const updated = await api.updateChicken(id, updates);
      setChickens(prev => prev.map(c => (c.id === id ? updated : c)));
      return updated;
    } catch (error) {
      console.error('Error updating chicken:', error);
      throw error;
    }
  };

  const deleteChicken = async (id) => {
    try {
      await api.deleteChicken(id);
      setChickens(prev => prev.filter(c => c.id !== id));
      // cleanup logs cache
      setFeedLogsByChicken(prev => { const n = { ...prev }; delete n[id]; return n; });
      return true;
    } catch (error) {
      console.error('Error deleting chicken:', error);
      throw error;
    }
  };

  const getChickenById = (id) => chickens.find(chicken => chicken.id === id) || null;

  const value = {
    chickens,
    loading,
    addChicken,
    updateChicken,
    deleteChicken,
    getChickenById,
    // Feed log API (with cache)
    getFeedLogs: (chickenId) => feedLogsByChicken[chickenId] || [],
    refreshFeedLogs: async (chickenId) => {
      const logs = await api.listFeedLogs(chickenId);
      setFeedLogsByChicken(prev => ({ ...prev, [chickenId]: logs }));
      return logs;
    },
    addFeedLog: async (chickenId, entry) => {
      const created = await api.addFeedLog(chickenId, entry);
      setFeedLogsByChicken(prev => ({ ...prev, [chickenId]: [created, ...(prev[chickenId] || [])] }));
      // refresh chickens so feed aggregates reflect immediately
      await refreshChickens();
      return created;
    },
    updateFeedLog: async (chickenId, logId, updates) => {
      const updated = await api.updateFeedLog(chickenId, logId, updates);
      setFeedLogsByChicken(prev => ({
        ...prev,
        [chickenId]: (prev[chickenId] || []).map(l => (l.id === logId ? updated : l)),
      }));
      await refreshChickens();
      return updated;
    },
    deleteFeedLog: async (chickenId, logId) => {
      await api.deleteFeedLog(chickenId, logId);
      setFeedLogsByChicken(prev => ({
        ...prev,
        [chickenId]: (prev[chickenId] || []).filter(l => l.id !== logId),
      }));
      await refreshChickens();
      return true;
    },
    // Tag management via API updates
    getAllTags: async () => api.getAllTags(),
    renameTag: async (oldTag, newTag) => {
      const tasks = chickens
        .filter(c => Array.isArray(c.tags) && c.tags.includes(oldTag))
        .map(async (c) => {
          const set = new Set(c.tags);
          set.delete(oldTag);
          set.add(newTag);
          await api.updateChicken(c.id, { tags: Array.from(set) });
        });
      await Promise.all(tasks);
      const rows = await api.listChickens();
      setChickens(rows);
      return api.getAllTags();
    },
    deleteTag: async (tag) => {
      const tasks = chickens
        .filter(c => Array.isArray(c.tags) && c.tags.includes(tag))
        .map(c => api.updateChicken(c.id, { tags: c.tags.filter(t => t !== tag) }));
      await Promise.all(tasks);
      const rows = await api.listChickens();
      setChickens(rows);
      return api.getAllTags();
    },
    mergeTags: async (tags, newTag) => {
      const list = (Array.isArray(tags) ? tags : []).map(t => String(t).trim()).filter(Boolean);
      const tasks = chickens
        .filter(c => Array.isArray(c.tags) && c.tags.some(t => list.includes(t)))
        .map(async (c) => {
          const set = new Set(c.tags);
          list.forEach(t => set.delete(t));
          set.add(newTag);
          await api.updateChicken(c.id, { tags: Array.from(set) });
        });
      await Promise.all(tasks);
      const rows = await api.listChickens();
      setChickens(rows);
      return api.getAllTags();
    },
  };

  return (
    <ChickenContext.Provider value={value}>
      {children}
    </ChickenContext.Provider>
  );
};
