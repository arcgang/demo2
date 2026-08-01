import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:3099',
  },
  webServer: {
    command: 'npx tsx src/server.ts',
    port: 3099,
    reuseExistingServer: true,
    timeout: 30_000,
    env: { PORT: '3099' },
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
