import { render, RenderOptions } from '@testing-library/react';
import React from 'react';

import { ChickenProvider } from '@/contexts/ChickenContext';
import { api } from '@/services/apiClient';

export const renderWithProvider = (ui: React.ReactElement, options?: RenderOptions) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <ChickenProvider>{children}</ChickenProvider>
  );
  return render(ui, { wrapper: Wrapper, ...options });
};

// Test helpers for seeding mocked API responses
export const seedChickens = (rows: any[] = []) => {
  (api as any).listChickens.mockResolvedValueOnce(rows);
};

export const seedTags = (map: Record<string, number> = {}) => {
  (api as any).getAllTags.mockResolvedValue(map);
};
