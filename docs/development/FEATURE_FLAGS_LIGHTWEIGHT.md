# Feature Flags: Lightweight Three-State System

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

## 5. Debugging & MVP

### Console Command
To list all available flags and their current status in the browser console:
```js
listFeatureFlags()
```

### MVP Test Flag (`hudHeaderLowercase`)
*   **State:** `EXP` (Permanent)
*   **Purpose:** Verifies the feature flag pipeline is operational without affecting core logic.
*   **Behavior:** When enabled via `?flag_on=hudHeaderLowercase`, the HUD status text (e.g., "MANUAL") renders in lowercase ("manual").

---

## 6. Workflow

| Stage                | Flag Value | Behavior                                                |
| -------------------- | ---------- | ------------------------------------------------------- |
| Experiment / Testing | EXP        | Feature disabled by default, enabled only via URL param |
| Production Rollout   | ON         | Feature enabled for all users                           |
| Disable / Revert     | OFF        | Feature completely disabled                             |

**Notes:**

* This system is **lightweight**: no build steps, no frameworks, no deployment changes needed.
* The EXP state works in **any environment**, including production, staging, or local testing.
* Adding new features is as simple as defining a new flag in `FEATURE_FLAGS.js`.

---

✅ **Summary:**  
A single, maintainable approach for toggling experimental or permanent features safely, with zero risk to users until explicitly enabled, and fully centralized for easy management.
