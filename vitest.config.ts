import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globalSetup: ['./test/global-setup.ts'],
    fileParallelism: false,
    testTimeout: 15000,
    env: {
      SESSION_SECRET: 'test-secret-not-for-production-use-32bytes',
      AUTH_CALLBACK_BASE_URL: 'http://localhost:5174',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5532/db_corkboard_test?schema=public',
      NODE_ENV: 'test',
    },
  },
});
