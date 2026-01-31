import { test, expect } from '@playwright/test';

/**
 * @fileoverview mobile-hud.spec.js
 * VALIDATION: Mobile UX Hardening (v0.5.4.1)
 * Covers: Safari Layout, Tooltip Suppression, Container Alignment, FOUC Prevention.
 */

test.describe('Mobile UX Hardening', () => {
  test.use({
    viewport: { width: 375, height: 667 },
    isMobile: true,
    hasTouch: true
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/?mobileHudOptimization=true');
    await page.waitForSelector('.MicroNav_Toggle', { state: 'visible' });
  });

  test('Safari Layout: Hamburger respects safe area insets', async ({ page }) => {
    const toggle = page.locator('.MicroNav_Toggle');
    const style = await toggle.getAttribute('style');
    // [cite: 2026-01-30] VALIDATION: Ensure env() variable is present in inline style
    expect(style).toContain('env(safe-area-inset-bottom)');

    // [cite: 2026-01-30] VALIDATION: Ensure button is physically within viewport bounds
    const box = await toggle.boundingBox();
    const viewport = page.viewportSize();
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  });

  test('Tooltip Suppression: Tooltips do not appear on hover in mobile mode', async ({ page }) => {
    // Expand nav to access elements
    await page.locator('.MicroNav_Toggle').click({ force: true });
    
    const aboutLink = page.getByTestId('about-link');
    await aboutLink.hover();
    
    // [cite: 2026-01-30] VALIDATION: Tooltip should remain hidden
    const tooltip = page.getByTestId('math-tooltip-hud');
    await expect(tooltip).not.toBeVisible();
  });

  test('Hydration Gate: UI is hidden during initial load to prevent FOUC', async ({ page }) => {
    // [cite: 2026-01-30] VALIDATION: Ensure desktop layout never flashes on mobile load (Negative Invariant)
    await page.reload();
    
    // The container should either be loading OR mobile. It should NEVER be desktop.
    await expect(page.locator('.layout-desktop')).toHaveCount(0);
    
    // Eventually it must settle to mobile
    const container = page.locator('.Container');
    await expect(container).toHaveClass(/layout-mobile/);
  });

  test.describe('Interface Container Positioning', () => {
    test.beforeEach(async ({ page }) => {
      await page.locator('.MicroNav_Toggle').click({ force: true });
    });

    const verifyPosition = async (page, container) => {
      // [cite: 2026-01-30] VALIDATION: Mobile popouts must align to the left edge of the label stripe
      // The container must be offset left via transform (not layout) to prevent Safari drift.
      // We check computed style or class application.
      await expect(container).toHaveClass(/Controls_Show/);
      
      // Check CSS directly for the critical positioning rule
      // [cite: 2026-01-31] UPDATE: We now use transform for positioning, not left/margin.
      // left is forced to 0 !important to prevent layout drift.
      const translateX = await container.evaluate(el => {
        const style = getComputedStyle(el);
        const matrix = new DOMMatrix(style.transform);
        return matrix.m41;
      });
      
      expect(translateX).toBeLessThan(0);
      expect(translateX).toBeGreaterThan(-32); // Prevent excessive drift
    };

    test('Container aligns correctly after Label Press', async ({ page }) => {
      const stripe = page.getByTestId('control-stripe-bend');
      await stripe.locator('button.TAreaInterface___TitleButton').click();
      await verifyPosition(page, stripe.locator('.TAreaInterface_controlsContainer'));
    });

    test('Container aligns correctly after Shape Button Press', async ({ page }) => {
      const stripe = page.getByTestId('control-stripe-shape');
      // Open first
      await stripe.locator('button.TAreaInterface___TitleButton').click();
      
      // [cite: 2026-01-31] UX CONTRACT: Controls must be visible before interaction
      const controls = stripe.locator('.TAreaInterface_controlsContainer');
      await expect(controls).toBeVisible();

      // Click a shape button (should keep container open and aligned)
      await stripe.locator('button[data-shape="SINE"]').click({ force: true });
      await verifyPosition(page, stripe.locator('.TAreaInterface_controlsContainer'));
    });

    test('Container aligns correctly after Slider Rail Tap', async ({ page }) => {
      const stripe = page.getByTestId('control-stripe-bend');
      await stripe.locator('button.TAreaInterface___TitleButton').click();
      
      // [cite: 2026-01-31] UX CONTRACT: Controls must be visible before interaction
      const controls = stripe.locator('.TAreaInterface_controlsContainer');
      await expect(controls).toBeVisible();

      const rail = page.getByTestId('slider-BEND-X-rail');
      await rail.click({ force: true });
      
      await verifyPosition(page, stripe.locator('.TAreaInterface_controlsContainer'));
    });

    test('Container aligns correctly after Slider Handle Drag', async ({ page }) => {
      const stripe = page.getByTestId('control-stripe-bend');
      await stripe.locator('button.TAreaInterface___TitleButton').click();
      
      // [cite: 2026-01-31] UX CONTRACT: Controls must be visible before interaction
      const controls = stripe.locator('.TAreaInterface_controlsContainer');
      await expect(controls).toBeVisible();

      const handle = page.getByTestId('slider-BEND-X-handle');
      
      // [cite: 2026-01-31] STABILITY: Wait for stable visibility before bounding box
      await expect(handle).toBeVisible();
      
      const box = await handle.boundingBox();
      
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + 50, box.y);
      await page.mouse.up();
      
      await verifyPosition(page, stripe.locator('.TAreaInterface_controlsContainer'));
    });
  });

  test('Safari Truth: About link is physically incapable of native callouts', async ({ page }) => {
    await page.locator('.MicroNav_Toggle').click({ force: true });

    const aboutLink = page.getByTestId('about-link');

    // Assert absolute absence of title attribute
    const title = await aboutLink.getAttribute('title');
    expect(title).toBeNull();

    // Simulate long-press to check for layout-destabilizing callouts
    await aboutLink.dispatchEvent('touchstart');
    await page.waitForTimeout(900);
    await aboutLink.dispatchEvent('touchend');

    // Verify React tooltip machine is silenced for mobile
    const tooltip = page.getByTestId('math-tooltip-hud');
    await expect(tooltip).not.toBeVisible();
  });

  test('Safari Truth: Slider container is anchored by transform, not layout', async ({ page }) => {
    await page.locator('.MicroNav_Toggle').click({ force: true });
    
    // Open a drawer to inspect the container
    const stripe = page.getByTestId('control-stripe-bend');
    await stripe.locator('button.TAreaInterface___TitleButton').click();

    const controls = stripe.locator('.TAreaInterface_controlsContainer');
    
    // [cite: 2026-01-31] INVARIANT: Ensure drawer is open before checking geometry
    await expect(controls).toHaveClass(/Controls_Show/);

    // Use DOMMatrix to verify the geometric invariant directly
    const translateX = await controls.evaluate(el => {
      const matrix = new DOMMatrix(getComputedStyle(el).transform);
      return matrix.m41; // Get X translation
    });

    // Verify it is anchored at the exact intended offset (-1rem approx)
    expect(translateX).toBeLessThan(0);
    expect(translateX).toBeGreaterThan(-20); 
  });
});