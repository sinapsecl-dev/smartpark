import { test, expect } from '@playwright/test';

test.describe('Booking Flow', () => {
  test('should allow a resident to book a free spot', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('h1')).toHaveText('Resident Parking Dashboard');

    // Assume some spots are free and clickable
    // Click on a free spot (e.g., green spot)
    // For now, let's assume a spot with specific text exists and is free
    await page.locator('.bg-green-500').first().click();

    // Expect the BookingForm to appear
    await expect(page.locator('h2', { hasText: 'Book Spot' })).toBeVisible();

    // Fill the booking form
    const licensePlate = `TEST-${Date.now().toString().slice(-4)}`;
    await page.getByLabel('License Plate').fill(licensePlate);

    // Set start and end times (these inputs are type="datetime-local")
    // Playwright needs specific date-time strings for these inputs
    const now = new Date();
    const startTime = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour duration

    // Format to YYYY-MM-DDTHH:MM
    const formatDateTime = (date: Date) => {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    await page.getByLabel('Start Time').fill(formatDateTime(startTime));
    await page.getByLabel('End Time').fill(formatDateTime(endTime));

    // Submit the form
    await page.getByRole('button', { name: 'Book Spot' }).click();

    // Expect success message (alert or toast)
    await page.waitForEvent('dialog').then(dialog => {
      expect(dialog.message()).toContain('Booking created successfully!');
      dialog.accept();
    });

    // Expect booking form to close
    await expect(page.locator('h2', { hasText: 'Book Spot' })).not.toBeVisible();

    // Verify the spot is now occupied (e.g., color changed)
    // This part is difficult without knowing the spot name, so we'd need to adapt
    // For now, a general check or a specific spot to track.
    // await expect(page.locator(`text=${spotName}`)).toHaveClass(/bg-red-500/); // Example
  });

  test('should show error for invalid booking duration', async ({ page }) => {
    await page.goto('/dashboard');
    await page.locator('.bg-green-500').first().click();
    await expect(page.locator('h2', { hasText: 'Book Spot' })).toBeVisible();

    await page.getByLabel('License Plate').fill('INVALID-DURATION');

    const now = new Date();
    const startTime = new Date(now.getTime() + 5 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 10 * 60 * 1000); // 10 minutes (invalid)

    const formatDateTime = (date: Date) => {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    await page.getByLabel('Start Time').fill(formatDateTime(startTime));
    await page.getByLabel('End Time').fill(formatDateTime(endTime));

    await page.getByRole('button', { name: 'Book Spot' }).click();

    await expect(page.locator('p.text-red-600', { hasText: 'Booking duration must be between 15m and 4h, in 15-minute intervals.' })).toBeVisible();
  });

  // TODO: Add tests for cooldown, quota, delinquency once UI/feedback mechanism is clearer.
  // TODO: Add test for double booking prevention (requires two concurrent tests or specific setup)
});
