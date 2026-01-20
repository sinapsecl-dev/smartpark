import { test, expect } from '@playwright/test';

test.describe('Reporting Flow', () => {
  test('should allow a resident to report an issue for an occupied spot', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('h1')).toHaveText('Resident Parking Dashboard');

    // Assume some spots are occupied (e.g., red spot) and clickable
    // Click on an occupied spot
    // For now, let's assume a spot with specific text exists and is occupied
    await page.locator('.bg-red-500').first().click();

    // Expect the SpotDetailsModal to appear
    await expect(page.locator('h2', { hasText: 'Spot' })).toBeVisible();

    // Click the "Report Issue" button
    await page.getByRole('button', { name: 'Report Issue' }).click();

    // Expect the ReportIssueModal to appear
    await expect(page.locator('h2', { hasText: 'Report Issue' })).toBeVisible();

    // Fill the report form
    await page.getByLabel('Report Type').selectOption('ghost_booking'); // Select 'Ghost Booking'
    await page.getByLabel('Description (optional)').fill('Car is not here, but spot is marked occupied.');

    // Submit the form
    await page.getByRole('button', { name: 'Submit Report' }).click();

    // Expect success message (alert or toast)
    await page.waitForEvent('dialog').then(dialog => {
      expect(dialog.message()).toContain('Infraction report created successfully!');
      dialog.accept();
    });

    // Expect report modal to close
    await expect(page.locator('h2', { hasText: 'Report Issue' })).not.toBeVisible();
    // Expect spot details modal to close or remain open based on design.
    // For now, assume it closes.
    await expect(page.locator('h2', { hasText: 'Spot' })).not.toBeVisible();
  });

  // TODO: Add tests for different report types and error handling.
});
