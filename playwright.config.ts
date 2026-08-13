import { defineConfig } from '@playwright/test'

const PORT = 4173
const DEV_PORT = 5174
const baseURL = `http://127.0.0.1:${PORT}`
const devURL = `http://127.0.0.1:${DEV_PORT}`

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
      // The layout suite sets its own viewports for every case it covers, so
      // running it again under this project's would only re-test the override.
      testIgnore: /layout\.spec\.ts/,
      use: {
        browserName: 'chromium',
        viewport: { width: 820, height: 1180 },
        hasTouch: true,
        isMobile: true,
      },
    },
    /*
     * The same app served by `npm run dev`, where React StrictMode mounts every
     * effect twice.
     *
     * This project exists because a real bug lived in that gap and nothing
     * caught it: disposing the WebGL context on cleanup meant the second mount
     * inherited a dead context, so chapters 0 and 5 rendered black for a whole
     * development session while the production build — all this suite tested —
     * was perfect.
     */
    {
      name: 'dev-strict-mode',
      testMatch: /canvas\.spec\.ts/,
      use: {
        browserName: 'chromium',
        viewport: { width: 1280, height: 800 },
        baseURL: devURL,
      },
    },
  ],
  webServer: [
    {
      // `--host 127.0.0.1` is not cosmetic: vite preview otherwise binds the
      // `localhost` alias, which can resolve to ::1 while Playwright probes the
      // IPv4 address and waits for a server that is already up.
      command: `npm run build && npm run preview -- --port ${PORT} --strictPort --host 127.0.0.1`,
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `npm run dev -- --port ${DEV_PORT} --strictPort --host 127.0.0.1`,
      url: devURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
})
