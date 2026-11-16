// Tests de bout en bout (navigateur) — npm run test:e2e
// Chaque scénario tourne sur ordinateur, téléphone Android, iPhone et iPad (émulés).
// iPhone et iPad utilisent WebKit (le moteur de Safari) si E2E_WEBKIT=1 (cas de la CI),
// sinon Chromium avec la taille d'écran, le tactile et le user-agent de l'appareil.
const { defineConfig, devices } = require('@playwright/test');
const webkit = process.env.E2E_WEBKIT === '1';
const apple = (d) => ({ ...devices[d], ...(webkit ? {} : { browserName: 'chromium' }) });

module.exports = defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'list' : 'line',
  use: { baseURL: 'http://127.0.0.1:8765/', trace: 'retain-on-failure' },
  webServer: {
    command: 'python3 -m http.server 8765 --bind 127.0.0.1',
    url: 'http://127.0.0.1:8765/index.html',
    reuseExistingServer: !process.env.CI
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 820 } } },
    { name: 'android', use: { ...devices['Pixel 7'] } },
    { name: 'iphone', use: apple('iPhone SE') },
    { name: 'ipad', use: apple('iPad (gen 7)') }
  ]
});
