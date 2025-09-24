import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.js'],
    globals: true,
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: './coverage',
      all: true,
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/main.jsx',
        'src/App.jsx',
        'src/components/ChickenDashboard.jsx',
        'src/components/FeedLogModal.jsx',
        'src/components/TagManagerModal.jsx',
        '**/*.d.ts',
        '**/__tests__/**',
      ],
      thresholds: {
        lines: 0.8,
        functions: 0.8,
        branches: 0.8,
        statements: 0.8,
      },
    },
  },
});
