import { defineConfig, configDefaults } from 'vitest/config';
// Playwright specs (tests/e2e) run via `npm run test:e2e`, not vitest.
export default defineConfig({ test: { testTimeout: 120_000, hookTimeout: 60_000, exclude: [...configDefaults.exclude, 'tests/e2e/**', '**/dist/**'] } });
