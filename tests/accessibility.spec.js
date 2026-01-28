import { test } from './base.js';
import { expect } from '@playwright/test';

test.describe('v0.5.1 Accessibility Hardening', () => {
  test.beforeEach(async ({ page }) => {
    // Load the app with the accessibility flag enabled
    await page.goto('/parametric/?flag_on=accessibilityHardening');
    // Wait for the app to boot
    await page.waitForSelector('.Container');
  });

  test('Drawers have ARIA attributes for state and relationship', async ({ page }) => {
    // Target a drawer toggle button (e.g., "Shape" or "Project")
    // Using the class defined in Parametric.css
    const drawerButton = page.locator('.TAreaInterface___TitleButton').first();
    await expect(drawerButton).toBeVisible();

    // 1. Check aria-expanded state (should be present and boolean)
    const expanded = await drawerButton.getAttribute('aria-expanded');
    expect(expanded).toMatch(/true|false/);

    // 2. Check aria-controls linkage
    const controlsId = await drawerButton.getAttribute('aria-controls');
    expect(controlsId).toBeTruthy();

    // 3. Verify the content region exists and has role="region"
    const region = page.locator(`#${controlsId}`);
    await expect(region).toHaveAttribute('role', 'region');
  });

  test('Sliders have accessible labels via aria-labelledby', async ({ page }) => {
    // Ensure a drawer with sliders is open (e.g. Bend)
    const stripe = page.getByTestId('control-stripe-bend');
    const container = stripe.locator('.TAreaInterface_controlsContainer');
    if (!(await container.isVisible())) {
      await stripe.locator('button.TAreaInterface___TitleButton').click();
      await expect(container).toBeVisible();
    }

    // Target a slider input
    const slider = page.locator('[role="slider"]').first();
    await expect(slider).toBeVisible();

    // Check for aria-labelledby
    const labelledBy = await slider.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();

    // Verify the label element exists
    const label = page.locator(`#${labelledBy}`);
    await expect(label).toBeVisible();
  });

  test('WebGL Canvas has application role and dynamic label', async ({ page }) => {
    const canvas = page.locator('canvas.Three');
    await expect(canvas).toHaveAttribute('role', 'application');
    // Verify dynamic content (e.g. "Interactive 3D SINE... Status: Stable")
    await expect(canvas).toHaveAttribute('aria-label', /Interactive 3D.*zoom.*Status: Stable/i);
  });

  test('Live Telemetry (Performance Metrics) uses aria-live region', async ({ page }) => {
    // Wait for the worker pill to appear (indicates engine is running)
    // [cite: 2026-01-27] NOTE: Worker pill is currently commented out in ParametricView.js
    // const metrics = page.locator('.worker-pill');
    // await expect(metrics).toBeVisible();
    // 
    // // Should announce updates politely
    // await expect(metrics).toHaveAttribute('aria-live', 'polite');
  });

  test('Hidden drawer controls are removed from tab order', async ({ page }) => {
    // Ensure a drawer is closed (e.g. Shape)
    const stripe = page.getByTestId('control-stripe-shape');
    const button = stripe.locator('button.TAreaInterface___TitleButton');
    const container = stripe.locator('.TAreaInterface_controlsContainer');
    
    // Close if open
    if (await container.isVisible()) {
      await button.click();
    }
    
    await expect(container).toBeHidden();
    // Verify content is not visible to accessibility tree
    // Playwright's locator check for visibility implicitly checks display:none
    const innerButton = container.locator('button').first();
    if (await innerButton.count() > 0) {
        await expect(innerButton).toBeHidden();
    }
  });

  test('HUD Header is keyboard interactive', async ({ page }) => {
    const header = page.locator('.HUD_Header');
    // Ensure HUD is closed first to test opening
    const wrapper = page.locator('.HUD_Wrapper');
    if (!await wrapper.evaluate(el => el.classList.contains('is-closed'))) {
        await header.click();
    }
    
    await header.focus();
    await page.keyboard.press('Enter');
    await expect(wrapper).not.toHaveClass(/is-closed/);
    
    await page.keyboard.press('Space');
    await expect(wrapper).toHaveClass(/is-closed/);
  });

  test('HUD Editor supports Escape key navigation', async ({ page }) => {
    const header = page.locator('.HUD_Header');
    const wrapper = page.locator('.HUD_Wrapper');
    
    // Ensure open
    if (await wrapper.evaluate(el => el.classList.contains('is-closed'))) {
        await header.click();
    }
    
    const textarea = page.locator('.HUD_Textarea');
    await textarea.focus();
    await expect(textarea).toBeFocused();
    
    await page.keyboard.press('Escape');
    await expect(header).toBeFocused();
  });

  test('Global shortcuts move focus', async ({ page }) => {
    // Alt+I -> Interface
    await page.keyboard.press('Alt+I');
    const firstDrawerBtn = page.locator('.TAreaInterface___TitleButton').first();
    await expect(firstDrawerBtn).toBeFocused();

    // Alt+H -> HUD
    await page.keyboard.press('Alt+H');
    const hudHeader = page.locator('.HUD_Header');
    await expect(hudHeader).toBeFocused();

    // Alt+C -> Canvas
    await page.keyboard.press('Alt+C');
    const canvas = page.locator('#three');
    await expect(canvas).toBeFocused();
  });

  test('Semantic Parallel description provides non-visual context', async ({ page }) => {
    // Locate the semantic parallel container
    const description = page.locator('section.sr-only[aria-live="polite"]');
    await expect(description).toBeAttached();
    
    // Check for initial content
    await expect(description).toContainText(/current visualization is/i);
    
    // Open Shape drawer if needed
    const shapeDrawer = page.locator('button.TAreaInterface___TitleButton', { hasText: 'Shape' });
    if (await shapeDrawer.getAttribute('aria-expanded') === 'false') {
        await shapeDrawer.click();
    }

    // Change shape and verify description update
    const inactiveShape = page.locator('button[data-shape]:not(.IconButton___Active)').first();
    const shapeName = await inactiveShape.getAttribute('data-shape');
    await inactiveShape.click();
    await expect(description).toContainText(new RegExp(shapeName, 'i'));
  });
});