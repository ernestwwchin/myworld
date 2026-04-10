const { defineConfig } = require('@playwright/test');

const E2E_PORT = Number(process.env.PLAYWRIGHT_PORT || 3100);
const E2E_BASE_URL = `http://127.0.0.1:${E2E_PORT}`;

module.exports = defineConfig({
  testDir: '.',
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: E2E_BASE_URL,
    browserName: 'chromium',
    headless: true,
    viewport: { width: 1400, height: 900 },
  },
  webServer: {
    command: `PORT=${E2E_PORT} npm start`,
    url: E2E_BASE_URL,
    reuseExistingServer: true,
    timeout: 30000,
  },
});