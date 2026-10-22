import { defineConfig, devices } from '@playwright/test';

const address = 'http://localhost:4301';

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  reporter: 'list',
  use: { baseURL: address },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: { args: ['--enable-precise-memory-info'] },
      },
    },
  ],
  webServer: {
    command: 'npx ng serve --port 4301',
    url: address,
    reuseExistingServer: true,
    timeout: 180_000,
    env: { NG_CLI_ANALYTICS: 'false' },
  },
});
