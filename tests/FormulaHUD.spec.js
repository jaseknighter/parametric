import { test, expect } from '@playwright/test';

/**
 * @fileoverview FormulaHUD.spec.js
 * UNIT/INTEGRATION TEST: Validates the Formula HUD component behavior.
 * Focuses on UI states, interactions, and prop-driven rendering logic.
 */

test.describe('Component: FormulaHUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => { 
      window.__PLAYWRIGHT__ = true; 
      // [cite: 2026-01-19] FIX: Robust Wake-up Protocol for Headless RAF
      Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
      Object.defineProperty(document, 'hidden', { value: false, writable: true });
    });
    
    await page.goto('/');
    // Wait for engine stability
    await page.waitForFunction(() => window.scene && window.intentService, { timeout: 5000 });
    
    // Ensure HUD is open
    const wrapper = page.locator('.HUD_Wrapper');
    if (await wrapper.evaluate(el => el.classList.contains('is-closed'))) {
      await page.locator('.HUD_Header').click();
    }
  });

  test('renders correctly in default (Auto) state', async ({ page }) => {
    const wrapper = page.locator('.HUD_Wrapper');
    await expect(wrapper).toBeVisible();
    await expect(wrapper).not.toHaveClass(/is-manual/);
    await expect(wrapper).not.toHaveClass(/has-error/);
    
    const textarea = page.locator('.HUD_Textarea');
    await expect(textarea).toBeEditable();
    // Should contain default generated formula (e.g., for Circle)
    const val = await textarea.inputValue();
    expect(val).toContain('x =');
  });

  test('transitions to Manual Mode on input', async ({ page }) => {
    const textarea = page.locator('.HUD_Textarea');
    await textarea.fill('x = u; y = v; z = 0;');
    
    const wrapper = page.locator('.HUD_Wrapper');
    await expect(wrapper).toHaveClass(/is-manual/);
    
    // [cite: 2026-01-18] FIX: Verify header text change instead of removed status pill
    const header = page.locator('.HUD_Header span');
    await expect(header).toHaveText("FORMULA EDITOR (MANUAL)");
  });

  test('transitions to Manual Mode on focus', async ({ page }) => {
    const textarea = page.locator('.HUD_Textarea');
    const wrapper = page.locator('.HUD_Wrapper');
    
    // Ensure we are in Auto mode
    await expect(wrapper).not.toHaveClass(/is-manual/);
    
    await textarea.focus();
    await expect(wrapper).toHaveClass(/is-manual/);
  });

  test('displays error state for invalid syntax', async ({ page }) => {
    const textarea = page.locator('.HUD_Textarea');
    // "x = ;" is invalid syntax
    await textarea.fill('x = ;');
    
    const wrapper = page.locator('.HUD_Wrapper');
    await expect(wrapper).toHaveClass(/has-error/);
    
    // Verify error message in status (if applicable) or just the visual cue
    // The current implementation might not show specific error text in the HUD header,
    // but the class is the contract.
  });

  test('toggles open/closed state via header click', async ({ page }) => {
    const header = page.locator('.HUD_Header');
    const wrapper = page.locator('.HUD_Wrapper');
    
    // Close
    await header.click();
    await expect(wrapper).toHaveClass(/is-closed/);
    
    // Open
    await header.click();
    await expect(wrapper).not.toHaveClass(/is-closed/);
  });

  test('reverts to Auto Mode when "Reset" or "Auto" indicator is clicked (if implemented)', async ({ page }) => {
    // This depends on if there's a reset button exposed. 
    // If not, we test that external updates (like sliders) reset it, 
    // but that's covered in hud.spec.js.
    // Here we check if the UI reflects the "Generated" state correctly.
    
    // Force manual
    await page.locator('.HUD_Textarea').fill('x=u;y=v;z=0;');
    await expect(page.locator('.HUD_Wrapper')).toHaveClass(/is-manual/);
    
    // Trigger a slider update to force reset (simulated via script for precision)
    await page.evaluate(() => {
      window.onUpdateParametric([{ 
        paramToUpdate: 'bendAmtX', 
        newValue: 0.5, 
        category: 'deform' 
      }]);
    });
    
    await expect(page.locator('.HUD_Wrapper')).not.toHaveClass(/is-manual/);
  });

  test('handles focus and blur events', async ({ page }) => {
    const textarea = page.locator('.HUD_Textarea');
    
    await textarea.focus();
    await expect(textarea).toBeFocused();
    
    await textarea.blur();
    await expect(textarea).not.toBeFocused();
  });

  test('drags the HUD window', async ({ page }) => {
    const header = page.locator('.HUD_Header');
    const wrapper = page.locator('.HUD_Wrapper');
    
    const startBox = await wrapper.boundingBox();
    const headerBox = await page.locator('.HUD_Header').boundingBox();
    
    // [cite: 2026-01-18] FIX: Calculate relative drag to ensure positive delta.
    // Previously moved to absolute (x+100), which could be left of center.
    const startX = headerBox.x + headerBox.width / 2;
    const startY = headerBox.y + headerBox.height / 2;

    await page.waitForTimeout(100); // Stabilize before drag
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 100, startY + 100, { steps: 10 });
    await page.mouse.up();
    
    const endBox = await wrapper.boundingBox();
    expect(endBox.x).toBeGreaterThan(startBox.x);
    expect(endBox.y).toBeGreaterThan(startBox.y);
  });

  test('constrains drag to viewport bounds (Clamping)', async ({ page }) => {
    const header = page.locator('.HUD_Header');
    const wrapper = page.locator('.HUD_Wrapper');
    const headerBox = await header.boundingBox();
    
    const startX = headerBox.x + headerBox.width / 2;
    const startY = headerBox.y + headerBox.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(-500, -500, { steps: 5 }); // Try to drag off-screen (top-left)
    await page.mouse.up();
    
    const endBox = await wrapper.boundingBox();
    expect(endBox.x).toBeGreaterThanOrEqual(0);
    expect(endBox.y).toBeGreaterThanOrEqual(0);
  });

  test('resizes the HUD window', async ({ page }) => {
    const handle = page.locator('.HUD_Resize_Handle');
    const wrapper = page.locator('.HUD_Wrapper');
    
    const startBox = await wrapper.boundingBox();
    
    await handle.hover();
    await page.mouse.down();
    await page.mouse.move(startBox.x + startBox.width + 50, startBox.y + startBox.height + 50, { steps: 10 });
    await page.mouse.up();
    
    const endBox = await wrapper.boundingBox();
    expect(endBox.width).toBeGreaterThan(startBox.width);
    expect(endBox.height).toBeGreaterThan(startBox.height);
  });

  test('constrains resize to minimum dimensions', async ({ page }) => {
    const handle = page.locator('.HUD_Resize_Handle');
    const wrapper = page.locator('.HUD_Wrapper');
    
    const handleBox = await handle.boundingBox();
    const startX = handleBox.x + handleBox.width / 2;
    const startY = handleBox.y + handleBox.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    // Try to shrink to 0
    await page.mouse.move(startX - 500, startY - 500, { steps: 5 });
    await page.mouse.up();

    const endBox = await wrapper.boundingBox();
    // Min width 300, min height 150 (from source)
    expect(endBox.width).toBeGreaterThanOrEqual(300);
    expect(endBox.height).toBeGreaterThanOrEqual(150);
  });

  test('does not toggle open/closed state after dragging', async ({ page }) => {
    const header = page.locator('.HUD_Header');
    const wrapper = page.locator('.HUD_Wrapper');
    
    // Ensure open
    if (await wrapper.evaluate(el => el.classList.contains('is-closed'))) {
        await header.click();
    }
    await expect(wrapper).not.toHaveClass(/is-closed/);

    const headerBox = await header.boundingBox();
    const startX = headerBox.x + headerBox.width / 2;
    const startY = headerBox.y + headerBox.height / 2;

    // Drag interaction (Move down, move, up)
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 50, startY + 50, { steps: 5 });
    await page.mouse.up();

    // Should still be open because it was a drag, not a click
    await expect(wrapper).not.toHaveClass(/is-closed/);
    
    // Verify hasMoved reset: A subsequent click SHOULD close it
    await header.click();
    await expect(wrapper).toHaveClass(/is-closed/);
  });

  test('syncs scroll with highlighter', async ({ page }) => {
    const textarea = page.locator('.HUD_Textarea');
    const highlighter = page.locator('.HUD_Highlighter');
    
    // Fill with enough content to scroll
    const lines = Array(50).fill('x = u;').join('\n');
    await textarea.fill(lines);
    
    // Scroll textarea
    await textarea.evaluate(el => el.scrollTop = 100);
    // Dispatch scroll event to trigger handler
    await textarea.dispatchEvent('scroll');
    
    // Check highlighter scroll
    const scrollTop = await highlighter.evaluate(el => el.scrollTop);
    expect(scrollTop).toBe(100);
  });

  test('highlights x, y, z lines correctly', async ({ page }) => {
    const textarea = page.locator('.HUD_Textarea');
    const highlighter = page.locator('.HUD_Highlighter');
    
    const code = `x = 1;
y = 2;
z = 3;
// comment`;
    await textarea.fill(code);
    
    // Check classes in highlighter
    const lines = highlighter.locator('div');
    await expect(lines.nth(0)).toHaveClass(/tint-x/);
    await expect(lines.nth(1)).toHaveClass(/tint-y/);
    await expect(lines.nth(2)).toHaveClass(/tint-z/);
    await expect(lines.nth(3)).not.toHaveClass(/tint-/);
  });
});