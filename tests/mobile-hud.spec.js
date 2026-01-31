import { test, expect } from '@playwright/test';

/**
 * @fileoverview mobile-hud.spec.js
 * VALIDATION: Mobile UX Hardening (v0.5.4.1)
 * Covers: Safari Layout, Tooltip Suppression, Container Alignment, FOUC Prevention.
 */

test.describe('Mobile UX Hardening', () => {
  // [cite: 2026-01-31] COMPATIBILITY: Firefox does not support mobile emulation (touch events) in Playwright.
  test.skip(({ browserName }) => browserName === 'firefox', 'Firefox does not support isMobile emulation');

  test.use({
    viewport: { width: 375, height: 667 },
    isMobile: true,
    hasTouch: true
  });

  test.beforeEach(async ({ page }) => {
    // [cite: 2026-01-31] CONFIG: Enable hardening flag for validation
    await page.goto('/?mobileHudOptimization=true&flag_on=mobileHardening');
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
    
    // [cite: 2026-01-31] REALISM: Simulate mobile tap/long-press sequence
    await aboutLink.dispatchEvent('touchstart');
    await page.waitForTimeout(500); // Hold to trigger potential hover/tooltip logic
    await aboutLink.dispatchEvent('touchend');
    // [cite: 2026-01-30] VALIDATION: Tooltip should remain hidden
    const tooltip = page.getByTestId('math-tooltip-hud');
    await expect(tooltip).not.toBeVisible({ timeout: 1000 }); // Ensure it doesn't appear after a delay
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

    const verifyPosition = async (page, container, stripe) => {
      await expect(container).toHaveClass(/Controls_Show/);
      
      // [cite: 2026-01-31] VALIDATION: Strict Geometric Sentinel
      const label = stripe.locator('.TAreaInterface___TitleButton');
      const lBox = await label.boundingBox();
      const cBox = await container.boundingBox();

      // The 'Truth' coordinate: exactly where the label ends
      const labelRightEdge = lBox.x + lBox.width;

      // DELTA: Difference between label end and container start
      // If this is negative, the container is OVERLAPPING the label.
      // If this is positive > 0.5, there is a visible GAP.
      const drift = cBox.x - labelRightEdge;

      // [cite: 2026-01-31] UPDATED VERIFICATION: Align with Negative Margin Guard
      // With our -1px margin, drift should be exactly -1.
      // We allow 0.5px for sub-pixel rendering discrepancies.
      expect(drift, `GAP DETECTED: ${drift}px`).toBeLessThanOrEqual(0);
      expect(drift, `EXCESSIVE OVERLAP: ${drift}px`).toBeGreaterThanOrEqual(-1.5);
    };

    test('Container aligns correctly after Label Press', async ({ page }) => {
      const stripe = page.getByTestId('control-stripe-bend');
      await stripe.locator('button.TAreaInterface___TitleButton').click();
      await verifyPosition(page, stripe.locator('.TAreaInterface_controlsContainer'), stripe);
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
      await verifyPosition(page, stripe.locator('.TAreaInterface_controlsContainer'), stripe);
    });

    test('Container aligns correctly after Slider Rail Tap', async ({ page }) => {
      const stripe = page.getByTestId('control-stripe-bend');
      await stripe.locator('button.TAreaInterface___TitleButton').click();
      
      // [cite: 2026-01-31] UX CONTRACT: Controls must be visible before interaction
      const controls = stripe.locator('.TAreaInterface_controlsContainer');
      await expect(controls).toBeVisible();

      const rail = page.getByTestId('slider-BEND-X-rail');
      await rail.tap({ force: true });
      
      await verifyPosition(page, stripe.locator('.TAreaInterface_controlsContainer'), stripe);
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
      
      // [cite: 2026-01-31] REALISM: Use mouse for drag simulation (Playwright touch drag is limited)
      const startX = box.x + box.width / 2;
      const startY = box.y + box.height / 2;
      
      // Note: Playwright doesn't have a direct 'swipe' on touchscreen, so we simulate tap/move if needed, 
      // but for sliders, mouse events often map to touch. However, let's stick to mouse for drag 
      // as touchscreen.tap doesn't drag. Playwright's mouse works for touch emulation in mobile viewports.
      // Reverting to mouse for drag but keeping the wait.
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX + 50, startY);
      await page.mouse.up();
      
      await verifyPosition(page, stripe.locator('.TAreaInterface_controlsContainer'), stripe);
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

  test('Visual Integrity: No overlap/gap on any stripe', async ({ page }) => {
    await page.locator('.MicroNav_Toggle').click({ force: true });
    
    // Get all label stripes
    const stripes = page.locator('.TAreaInterface');
    const count = await stripes.count();
    expect(count).toBeGreaterThan(0);

    // Helper to check gap for a specific index
    const checkGap = async (index) => {
      const stripe = stripes.nth(index);
      const label = stripe.locator('.TAreaInterface___TitleButton');
      const container = page.locator('.Interface_Container');
      
      const labelBox = await label.boundingBox();
      const containerBox = await container.boundingBox();
      
      // The label should be visually contained within or flush with the container's left edge
      expect(labelBox.x).toBeGreaterThanOrEqual(containerBox.x);
    };

    // Check all labels to catch the "upward expanding" gap issue
    for (let i = 0; i < count; i++) {
      await checkGap(i);
    }
  });

  test('Integrity Guard: Container never overlaps label text', async ({ page }) => {
    await page.locator('.MicroNav_Toggle').click({ force: true });
    const label = page.locator('.TAreaInterface___TitleButton').first();
    const container = page.locator('.TAreaInterface_controlsContainer').first();
    
    await label.click({ force: true });
    
    // [cite: 2026-01-31] STABILITY: Ensure element is painted before measuring
    await expect(container).toBeVisible();

    const lBox = await label.boundingBox();
    const cBox = await container.boundingBox();

    if (!lBox || !cBox) throw new Error("Visibility Race: Elements not measured");

    // Physics check: Container X must be >= Label Right Edge
    expect(cBox.x, `OVERLAP: Container at ${cBox.x} is left of Label Edge ${lBox.x + lBox.width}`).toBeGreaterThanOrEqual(lBox.x + lBox.width - 1); 
  });

  test('Viewport Containment: Interface controls do not overflow bottom of screen', async ({ page }) => {
    await page.locator('.MicroNav_Toggle').click({ force: true });
    const viewport = page.viewportSize();
    
    const stripes = page.locator('.TAreaInterface');
    const count = await stripes.count();

    for (let i = 0; i < count; i++) {
      const stripe = stripes.nth(i);
      const label = stripe.locator('.TAreaInterface___TitleButton');
      
      await label.click({ force: true });
      const container = stripe.locator('.TAreaInterface_controlsContainer');
      await expect(container).toBeVisible();
      
      const box = await container.boundingBox();
      if (box) {
        // [cite: 2026-01-31] LAYOUT: Ensure popout stays within vertical bounds
        expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
      }
      await label.click({ force: true }); // Close to reset
    }
  });
});