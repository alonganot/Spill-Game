/// <reference types="vitest/config" />
import { configDefaults } from 'vitest/config';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `npm run test:balance` (mode "balance") runs only the slow balance simulation;
// the normal test run skips it.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  test: {
    include: mode === 'balance' ? ['src/**/*.sim.test.ts'] : ['src/**/*.test.ts'],
    exclude: mode === 'balance' ? configDefaults.exclude : [...configDefaults.exclude, 'src/**/*.sim.test.ts'],
    environment: 'node',
  },
}));
