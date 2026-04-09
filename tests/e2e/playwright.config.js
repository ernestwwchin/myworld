const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '.',
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:3000',
    headless: true,
    viewport: { width: 1400, height: 900 },
  },
  webServer: {
    command: 'npm start',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: true,
    timeout: 30000,
  },
});