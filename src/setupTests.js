import '@testing-library/jest-dom';
import { beforeEach, vi } from 'vitest';

// Provide a default mock for the API client. Individual tests can override implementations.
vi.mock('./services/apiClient', () => {
  const api = {
    listChickens: vi.fn().mockResolvedValue([]),
    addChicken: vi.fn().mockImplementation(async (data) => ({ id: 'test-id', ...data })),
    updateChicken: vi.fn().mockImplementation(async (id, updates) => ({ id, ...updates })),
    deleteChicken: vi.fn().mockResolvedValue(null),
    listFeedLogs: vi.fn().mockResolvedValue([]),
    addFeedLog: vi.fn().mockImplementation(async (chickenId, entry) => ({ id: 'log-id', chickenId, ...entry })),
    updateFeedLog: vi.fn().mockImplementation(async (_id, _logId, updates) => ({ id: 'log-id', ...updates })),
    deleteFeedLog: vi.fn().mockResolvedValue(null),
    getAllTags: vi.fn().mockResolvedValue({}),
  };
  return { api };
});

// Ensure clean localStorage between tests
beforeEach(() => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.clear();
  }
  // Reset all API mocks between tests
  try {
    // dynamic import to access the mocked module
    // eslint-disable-next-line no-undef
    const { api } = require('./services/apiClient');
    Object.values(api).forEach((fn) => typeof fn?.mockReset === 'function' && fn.mockReset());
  } catch {}
});
