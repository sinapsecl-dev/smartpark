import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv'; // Import dotenv
import path from 'path';

// Read environment variables from .env.local file
dotenv.config({ path: '.env.local' });

// Ensure SUPABASE_JWT_SECRET is set for the webServer (Temporarily removed strict check for debugging)
if (!process.env.SUPABASE_JWT_SECRET) {
  console.warn('SUPABASE_JWT_SECRET is not set in .env.local for Playwright webServer. This might cause authentication issues.');
}

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e', // Assuming E2E tests will be in an 'e2e' directory
  globalSetup: require.resolve('./e2e/auth.setup'), // Add global setup for authentication
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/user.json' }, // Use storageState
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], storageState: 'playwright/.auth/user.json' }, // Use storageState
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'], storageState: 'playwright/.auth/user.json' }, // Use storageState
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev -- --webpack', // Force Webpack for Next.js dev server
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    // Pass environment variables explicitly to the webServer process
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
      SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET as string, // Add JWT secret
    },
  },
});
