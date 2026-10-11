import { defineConfig, devices } from '@playwright/test'

// The project has no node type definitions, so the CI flag is read through a typed view of the global.
const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}
const isCI = Boolean(env.CI)

// Chromium only, in two shapes: a desktop window and an iPhone 15 (which gets
// the paper version). The dev server is started on 5173 when not already up.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: isCI ? 1 : 0,
  reporter: isCI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    permissions: ['clipboard-read', 'clipboard-write'],
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'iphone-15',
      use: { ...devices['iPhone 15'], browserName: 'chromium' },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !isCI,
    timeout: 60_000,
  },
})
