import '@testing-library/jest-dom';
import { beforeEach, vi } from 'vitest';

// Use manual mock from src/services/__mocks__/apiClient.ts
vi.mock('@/services/apiClient');

// Ensure clean localStorage between tests
beforeEach(async () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.clear();
  }
  // Reset all API mocks between tests
  try {
    // dynamic import to access the mocked module
    const mod = await import('@/services/apiClient');
    const mocked = vi.mocked(mod.api);
    Object.values(mocked).forEach((fn: any) => typeof fn?.mockReset === 'function' && fn.mockReset());
  } catch {
    // ignore
  }
});
