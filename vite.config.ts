/// <reference types="vitest/config" />
import { configDefaults } from 'vitest/config';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { version } from './package.json';

// `npm run test:balance` (mode "balance") runs only the slow balance simulation;
// the normal test run skips it.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // The game's version, shown on the main menu. The release workflow sets it in package.json before building.
  define: { __APP_VERSION__: JSON.stringify(version) },
  test: {
    include: mode === 'balance' ? ['src/**/*.sim.test.ts'] : ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    exclude: mode === 'balance' ? configDefaults.exclude : [...configDefaults.exclude, 'src/**/*.sim.test.ts'],
    environment: 'node',
  },
}));
