# Feature Flags: Lightweight Three-State System - DRAFT (v0.5.1)

**NOTE: AI generated, still under review.**

> **Related:** [Feature Flags: Testing Strategy](./FEATURE_FLAGS_TESTING.md)

This is a minimal, maintainable approach for controlling experimental and permanent features in the Parametric Engine. It supports **OFF**, **ON**, and **EXP** (experimental) states.

---

## 1. Centralized Configuration (`FEATURE_FLAGS.js`)

```js
// /shared/FEATURE_FLAGS.js

export const FLAG_STATE = {
  OFF: 'OFF',   // Feature completely disabled
  ON: 'ON',     // Feature enabled for all users
  EXP: 'EXP',   // Experimental: enabled only via URL param
};

export const FEATURE_FLAGS = {
  mobileHUDImprovements: FLAG_STATE.EXP,
  pinchToZoomDisable: FLAG_STATE.EXP,
  // add new flags here
};
```

> All flags live in one place, so enabling/disabling a feature never requires editing multiple files.

---

## 2. Implementation Phases

### Phase 1: URL-Based Control (Current / v0.5.x)
*   **Mechanism:** URL Query Parameters.
*   **Syntax:** `?flag_on=featureName`
*   **Multi-Flag Support:** `?flag_on=featureA&flag_on=featureB`
*   **Disable Override:** `?flag_off=featureName` (Forces an ON flag to OFF)
*   **Persistence:** None (Session only).

### Phase 2: Persistence & UI (Post-v0.5)
*   **Mechanism:** `localStorage` + Debug Drawer.
*   **Persistence:** Flags remain active across reloads.
*   **UI:** Hidden drawer to toggle flags without URL manipulation.

---

## 3. Helper Function (Phase 1 Implementation)

```js
// /shared/featureFlagUtils.js
import { FEATURE_FLAGS, FLAG_STATE } from './FEATURE_FLAGS.js';

export function isFeatureEnabled(flagName) {
  const flagState = FEATURE_FLAGS[flagName];

  if (!flagState || flagState === FLAG_STATE.OFF) return false;
  
  const urlParams = new URLSearchParams(window.location.search);

  if (flagState === FLAG_STATE.ON) {
    // Allow disabling via URL: ?flag_off=featureName
    const disabledFlags = urlParams.getAll('flag_off');
    return !disabledFlags.includes(flagName);
  }

  // EXP mode: enabled if URL contains ?flag_on=<flagName>
  // Supports multiple flags: ?flag_on=featA&flag_on=featB
  if (flagState === FLAG_STATE.EXP) {
    const activeFlags = urlParams.getAll('flag_on');
    return activeFlags.includes(flagName);
  }

  return false;
}
```

---

## 3. Example Usage in Application Code

```js
import { isFeatureEnabled } from '/shared/featureFlagUtils.js';

// Mobile HUD improvements
if (isFeatureEnabled('mobileHUDImprovements')) {
  const hud = document.querySelector('.hud-container');
  hud.style.bottom = '0';
  hud.style.top = 'auto';

  document.querySelector('.header').style.opacity = '0.85';
  document.querySelector('.sidebar').style.opacity = '0.85';
}

// Disable pinch-to-zoom on canvas
if (isFeatureEnabled('pinchToZoomDisable')) {
  const canvasContainer = document.querySelector('.canvas-container');
  canvasContainer.style.touchAction = 'none';
}
```

> By default, both features are **disabled for all users**.  
> To test in experimental mode: visit `https://yourapp.com?flag_on=mobileHUDImprovements`.

---

## 5. Debugging & Verification

### The MVP Verification Test (`hudHeaderLowercase`)
This flag serves as the "Sanity Check" for the entire pipeline. It verifies that a logic change in the Registry can successfully bypass CSS constraints and reach the screen.

* **Flag Name:** `hudHeaderLowercase`
* **Initial State:** `EXP`
* **Success Criteria:** The HUD Status text transitions from uppercase to lowercase.

#### How to Verify Manually:
1.  **Standard View**:
    *   **Dev:** `http://localhost:3000/parametric/`
    *   **Prod:** `https://jaseknighter.github.io/parametric/`
    *   *Result:* HUD shows `FORMULA EDITOR (AUTO)`
2.  **Experimental View**:
    *   **Dev:** `http://localhost:3000/parametric/?flag_on=hudHeaderLowercase`
    *   **Prod:** `https://jaseknighter.github.io/parametric/?flag_on=hudHeaderLowercase`
    *   *Result:* HUD shows `FORMULA EDITOR (auto)`
3.  **Override View**:
    *   **Dev:** `http://localhost:3000/parametric/?flag_off=hudHeaderLowercase`
    *   **Prod:** `https://jaseknighter.github.io/parametric/?flag_off=hudHeaderLowercase`
    *   *Result:* HUD reverts to `FORMULA EDITOR (AUTO)`

### Console Audit
Type this in the browser console to see the live state of all "Contractual Invariants":
```javascript
Debug.listFlags()
```

---

## 6. Displaying Flags in console

Use: Debug.listFlags() to show:

+---------------------------+------+------------+-----------+
| Flag                      | Type | State      | Version   |
+---------------------------+------+------------+-----------+
| accessibilityHardening    | EXP  | ❌ DISABLED | 0.5.1 (dev) |
| mobileHudOptimization     | EXP  | ✅ ENABLED  | 0.5.2 (dev) |
| pinchToZoomDisable        | EXP  | ❌ DISABLED | 0.5.2 (dev) |
| docsBridge                | EXP  | ✅ ENABLED  | 0.5.3 (dev) |
| instructionalRefinement   | EXP  | ❌ DISABLED | 0.5.4 (dev) |
| hudHeaderLowercase        | EXP  | ✅ ENABLED  | 0.5.4 (dev) |
+---------------------------+------+------------+-----------+

Links to Toggle Features:

[Experimental Flags]
────────────────────────────
Flag: accessibilityHardening
  Enable: http://localhost:3000/parametric/?flag_on=accessibilityHardening
  Disable: http://localhost:3000/parametric/?flag_off=accessibilityHardening

Flag: mobileHudOptimization
  Enable: http://localhost:3000/parametric/?flag_on=mobileHudOptimization
  Disable: http://localhost:3000/parametric/?flag_off=mobileHudOptimization

[Standard Flags]
────────────────────────────
Flag: testFlagOn
  Enable: http://localhost:3000/parametric/?flag_on=testFlagOn
  Disable: http://localhost:3000/parametric/?flag_off=testFlagOn

**Notes:**

* This system is **lightweight**: no build steps, no frameworks, no deployment changes needed.
* The EXP state works in **any environment**, including production, staging, or local testing.
* Adding new features is as simple as defining a new flag in `FEATURE_FLAGS.js`.

---

## 7. Post 0.5.X Improvements

### The "Pre-Commit Guard" (Automated Diff Checking)
To prevent accidental feature leaks, we can implement a Git Hook (using `husky` and `lint-staged`) that scans staged files for new logic that isn't wrapped in a feature flag check.

**Example Logic (`scripts/guard-feature-leak.js`):**
```javascript
const { execSync } = require('child_process');

// Get the current diff
const diff = execSync('git diff --cached').toString();

// Regex to find new blocks of code (lines starting with +)
const newLines = diff.split('\n').filter(line => line.startsWith('+') && !line.startsWith('+++'));

// CHECK: If we see a new 'Export' or 'A11y' string without an 'isFeatureEnabled' nearby
const suspectedLeaks = newLines.filter(line => {
  return (line.includes('aria-') || line.includes('Export')) && !line.includes('isFeatureEnabled');
});

if (suspectedLeaks.length > 0) {
  console.warn("⚠️ [FLAG GUARD] Potential feature leak detected in new code.");
  console.warn("Ensure new v0.5.X logic is wrapped in isFeatureEnabled().");
  // process.exit(1); // Uncomment to block the commit
}
```

---

✅ **Summary:**  
A single, maintainable approach for toggling experimental or permanent features safely, with zero risk to users until explicitly enabled, and fully centralized for easy management.
