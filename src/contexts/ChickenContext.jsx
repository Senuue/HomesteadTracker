import React, { createContext, useContext, useState, useEffect } from 'react';
import { storage } from '../utils/storage';

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

  // Load chickens from storage on mount
  useEffect(() => {
    const loadChickens = () => {
      try {
        const storedChickens = storage.getChickens();
        setChickens(storedChickens);
      } catch (error) {
        console.error('Error loading chickens:', error);
      } finally {
        setLoading(false);
      }
    };

    loadChickens();
  }, []);

  const addChicken = (chickenData) => {
    try {
      const newChicken = storage.addChicken(chickenData);
      setChickens(prev => [...prev, newChicken]);
      return newChicken;
    } catch (error) {
      console.error('Error adding chicken:', error);
      throw error;
    }
  };

  const updateChicken = (id, updates) => {
    try {
      const updatedChicken = storage.updateChicken(id, updates);
      if (updatedChicken) {
        setChickens(prev => 
          prev.map(chicken => 
            chicken.id === id ? updatedChicken : chicken
          )
        );
        return updatedChicken;
      }
      return null;
    } catch (error) {
      console.error('Error updating chicken:', error);
      throw error;
    }
  };

  const deleteChicken = (id) => {
    try {
      const success = storage.deleteChicken(id);
      if (success) {
        setChickens(prev => prev.filter(chicken => chicken.id !== id));
      }
      return success;
    } catch (error) {
      console.error('Error deleting chicken:', error);
      throw error;
    }
  };

  const getChickenById = (id) => {
    return chickens.find(chicken => chicken.id === id) || null;
  };

  const value = {
    chickens,
    loading,
    addChicken,
    updateChicken,
    deleteChicken,
    getChickenById,
    // Feed log API exposed via context
    getFeedLogs: (chickenId) => storage.getFeedLogs(chickenId),
    addFeedLog: (chickenId, entry) => {
      const created = storage.addFeedLog(chickenId, entry);
      if (created) {
        // Sync state: update that batch
        setChickens(prev => prev.map(c => c.id === chickenId ? storage.getChickenById(chickenId) : c));
      }
      return created;
    },
    updateFeedLog: (chickenId, logId, updates) => {
      const updated = storage.updateFeedLog(chickenId, logId, updates);
      if (updated) {
        setChickens(prev => prev.map(c => c.id === chickenId ? storage.getChickenById(chickenId) : c));
      }
      return updated;
    },
    deleteFeedLog: (chickenId, logId) => {
      const removed = storage.deleteFeedLog(chickenId, logId);
      if (removed) {
        setChickens(prev => prev.map(c => c.id === chickenId ? storage.getChickenById(chickenId) : c));
      }
      return removed;
    },
    // Tag management API
    getAllTags: () => storage.getAllTags(),
    renameTag: (oldTag, newTag) => {
      const result = storage.renameTag(oldTag, newTag);
      // Reload chickens to reflect tag mutations
      setChickens(storage.getChickens());
      return result;
    },
    deleteTag: (tag) => {
      const result = storage.deleteTag(tag);
      setChickens(storage.getChickens());
      return result;
    },
    mergeTags: (tags, newTag) => {
      const result = storage.mergeTags(tags, newTag);
      setChickens(storage.getChickens());
      return result;
    }
  };

  return (
    <ChickenContext.Provider value={value}>
      {children}
    </ChickenContext.Provider>
  );
};
