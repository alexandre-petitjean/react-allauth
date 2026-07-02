import { defineConfig, devices } from '@playwright/test'

// The Django backend (:8000) and Mailpit (:8025) must already be running:
// `cd playground/backend && docker compose up -d`. Playwright starts the
// Vite playground itself.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  // Scenarios share one backend user's session table; parallel runs would
  // make the sessions assertions racy.
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
