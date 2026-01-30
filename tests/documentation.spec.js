import { test } from './base.js';
import { expect } from '@playwright/test';

test.describe('v0.5.2 Documentation Bridge', () => {
  test.beforeEach(async ({ page }) => {
    // Load the app with the docsBridge flag enabled
    await page.goto('/parametric/?flag_on=docsBridge');
    // Wait for the app to boot
    await page.waitForSelector('.Container');
  });

  test('About link is present in the header', async ({ page }) => {
    const aboutLink = page.locator('.About_Link_Header');
    await expect(aboutLink).toBeVisible();
    await expect(aboutLink).toContainText('about');
  });

  test('About link points to GitHub repository', async ({ page }) => {
    const aboutLink = page.locator('.About_Link_Header');
    await expect(aboutLink).toHaveAttribute('href', 'https://github.com/jaseknighter/parametric');
    await expect(aboutLink).toHaveAttribute('target', '_blank');
  });

  test('Header elements are baseline aligned', async ({ page }) => {
    const header = page.locator('.Header');
    await expect(header).toHaveCSS('align-items', 'flex-end');
  });

  test('About link is hidden when flag is disabled', async ({ page }) => {
    await page.goto('/parametric/?flag_off=docsBridge');
    await expect(page.locator('.About_Link_Header')).toBeHidden();
  });
});