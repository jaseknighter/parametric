# Feature Flags: Testing Strategy (DRAFT)

**NOTE: AI generated, still under review.**

> **Related:** [Feature Flags: Lightweight Three-State System](./FEATURE_FLAGS_LIGHTWEIGHT.md)

As of the 0.5.2 release, the testing strategy for feature-flagged code in this project relies on a multi-layered approach that allows new features to be deployed safely (disabled by default) while still being rigorously tested in CI/CD pipelines.

Here is the breakdown of how tests were set up for code behind feature flags:

### 1. Feature Flag Configuration (FEATURE_FLAGS.js)
Flags are defined with a defaultValue (usually EXP for experimental features) and metadata like versionTarget and stage. This ensures that by default, new features are OFF for production users but can be enabled for testing.

```javascript
// src/shared/FEATURE_FLAGS.js
export const FEATURE_FLAGS = {
  accessibilityHardening: { defaultValue: FLAG_STATE.EXP, versionTarget: '0.5.1', stage: 'dev' },
  // ...
};
```

### 2. Test-Specific Flag Activation
Tests explicitly enable the feature flags they need to verify. This is done in the beforeEach hook of the test suite, ensuring that the test environment mimics the "enabled" state of the feature.

**Example from `tests/accessibility.spec.js`:**

```javascript
test.beforeEach(async ({ page }) => {
  // Load the app with the accessibility flag enabled
  await page.goto('/parametric/?flag_on=accessibilityHardening');
  // ...
});
```
This URL parameter (?flag_on=...) overrides the default EXP state, turning the feature ON for that specific test run.

### 3. Conditional Logic in Application Code
The application code uses isFeatureEnabled() to gate the new logic. This ensures that the code path is only executed when the flag is active.

**Example from `src/containers/Parametric/ParametricView.js`:**

```javascript
// FEATURE_FLAG_START: accessibilityHardening
const isA11y = isFeatureEnabled('accessibilityHardening');
// FEATURE_FLAG_END: accessibilityHardening

// ...

return (
  <div className={`Container ... ${isA11y ? 'flag-a11y-on' : ''}`}>
    {/* ... */}
    {isA11y && semanticDescription}
    {/* ... */}
  </div>
);
```

### 4. Unit Testing the Flag Utility (featureFlagUtils.test.js)
The flag utility itself is unit-tested to ensure that the logic for enabling/disabling flags via URL parameters works correctly. This validates the mechanism used by the E2E tests.

### 5. "Dark Zone" Coverage & Reclamation
Since the default state is often OFF, standard coverage reports might miss the new code. To address this:

* **E2E Tests (Playwright):** Run with flags enabled to exercise the UI and capture coverage for the new features.
* **Unit Tests (Jest):** Mock the isFeatureEnabled function or the FEATURE_FLAGS object to force the "ON" path during unit testing.

**Example Mock in `src/containers/Parametric/ParametricManager.test.js`:**

```javascript
jest.mock('../../shared/featureFlagUtils', () => ({
  FeatureFlags: {
    isEnabled: jest.fn(() => true), // Force flags ON for unit tests
    setFlag: jest.fn()
  }
}));
```

### Summary
This setup allows for **Safe Deployment** (features are hidden/disabled by default) while ensuring **Comprehensive Testing** (CI pipelines explicitly enable and verify the new code paths).