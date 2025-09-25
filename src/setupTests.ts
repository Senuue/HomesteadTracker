import '@testing-library/jest-dom';
import { beforeEach, vi } from 'vitest';

// Use manual mock from src/services/__mocks__/apiClient.ts
vi.mock('@/services/apiClient');

// Ensure clean localStorage between tests
beforeEach(() => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.clear();
  }
  // Reset all API mocks between tests
  try {
    // dynamic import to access the mocked module
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { api } = require('@/services/apiClient');
    const mocked = vi.mocked(api);
    Object.values(mocked).forEach((fn: any) => typeof fn?.mockReset === 'function' && fn.mockReset());
  } catch {}
});
