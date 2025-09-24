import React from 'react';
import { render } from '@testing-library/react';
import { ChickenProvider } from './contexts/ChickenContext';

export const renderWithProvider = (ui, options) => {
  const Wrapper = ({ children }) => <ChickenProvider>{children}</ChickenProvider>;
  return render(ui, { wrapper: Wrapper, ...options });
};
