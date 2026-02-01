import { chromium, expect } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';

async function globalSetup() {
  const authFile = 'playwright/.auth/user.json';
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // IMPORTANT: Ensure this test user exists in your Supabase project
  // and email/password login is enabled.
  const TEST_USER_EMAIL = 'test@example.com'; // Replace with an actual test user email
  const TEST_USER_PASSWORD = 'testpassword'; // Replace with the actual test user password

  console.log(`Attempting to log in test user via UI: ${TEST_USER_EMAIL}`);

  // Navigate to the login page
  await page.goto('http://localhost:3000/login');

  // Fill in the email and password fields
  await page.fill('input[type="email"]', TEST_USER_EMAIL);
  await page.fill('input[type="password"]', TEST_USER_PASSWORD);

  // Click the login button
  await page.click('button:has-text("Log In")');

  // Wait for navigation to the dashboard page after successful login
  await page.waitForURL('http://localhost:3000/dashboard');

  // Add debugging: Take a screenshot and log page content
  await page.screenshot({ path: 'playwright-debug/dashboard-after-login.png', fullPage: true });
  console.log('--- Dashboard Page Content After Login ---');
  console.log(await page.content());
  console.log('--- End Dashboard Page Content ---');

  // Verify that the user is successfully logged in and on the dashboard
  await expect(page.locator('h1:text("Estacionamiento de Visitas")')).toBeVisible({ timeout: 10000 });
  console.log(`Successfully logged in as ${TEST_USER_EMAIL} and navigated to dashboard.`);

  // Save the authenticated state for reuse in other tests
  await page.context().storageState({ path: authFile });
  await browser.close();
}

export default globalSetup;
