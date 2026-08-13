import { defineConfig } from '@playwright/test'

const PORT = 4173
const baseURL = `http://127.0.0.1:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    // Pin the browser language: the app picks its locale from it, and a suite
    // that silently ran in English would never exercise the French copy the
    // audience actually reads.
    locale: 'fr-FR',
  },
  // Two shapes that matter for this audience: a classroom projector and a
  // tablet held upright. Both on Chromium, the only engine installed by
  // `npx playwright install chromium`.
  projects: [
    {
      name: 'desktop',
      use: { browserName: 'chromium', viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'tablet-portrait',
      use: {
        browserName: 'chromium',
        viewport: { width: 820, height: 1180 },
        hasTouch: true,
        isMobile: true,
      },
    },
  ],
  webServer: {
    // `--host 127.0.0.1` is not cosmetic: vite preview otherwise binds the
    // `localhost` alias, which can resolve to ::1 while Playwright probes the
    // IPv4 address and waits for a server that is already up.
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort --host 127.0.0.1`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
