import React from 'react';
import { render } from '@testing-library/react';
import { ChickenProvider } from './contexts/ChickenContext';
import { api } from './services/apiClient';

export const renderWithProvider = (ui, options) => {
  const Wrapper = ({ children }) => <ChickenProvider>{children}</ChickenProvider>;
  return render(ui, { wrapper: Wrapper, ...options });
};

// Test helpers for seeding mocked API responses
export const seedChickens = (rows = []) => {
  api.listChickens.mockResolvedValueOnce(rows);
};

export const seedTags = (map = {}) => {
  api.getAllTags.mockResolvedValue(map);
};
