import '@testing-library/jest-dom';
import { beforeEach } from 'vitest';

// Ensure clean localStorage between tests
beforeEach(() => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.clear();
  }
});
