# 💡 Testing Tips-N-Tricks: Parametric Geometry Explorer (DRAFT)

**NOTE: AI generated, still under review.**

## 🏛️ Guiding Principles

Testing is an investment in stability. To ensure high returns, we follow these core philosophies:

* **Test Decisions, Not Paths:** Coverage is a proxy, not the goal. Improve coverage by validating the logic behind a decision. If a test doesn’t validate a **behavior contract**, a **policy decision** (i.e. architecture or business rule), or a **failure mode**, it is likely "fake coverage" (execution without assertion).
* **Fail Early, Fail Loudly:** Use guards like `process.stderr` and explicit timeouts to ensure that failures are immediately obvious and descriptive.
* **Deterministic Environments:** A test that passes only on your machine is a bug in the test. Always enforce specific viewports, states, and mocks to ensure consistency across CI (e.g. Linux) and Local (e.g. macOS).

---

## 1. General Testing Logic (Jest / Logic Layer)

### 📢 The "Ghost Log" Recovery

**Problem:** Jest often swallows `console.warn` or `console.error` inside complex hooks or services, leaving you blind to why a test is failing.

**Trick:** Force logs to the terminal's error stream in your setup block to bypass the silent treatment.

```javascript
beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation((...args) => {
    process.stderr.write(`⚠️ [TEST-WARN]: ${args.join(' ')}\n`);
  });
});
```

### 🛡️ Bypassing `event.isTrusted`

**Problem:** Security-hardened hooks block events where `isTrusted` is false. In JSDOM, all simulated events are untrusted by default.

**Trick:** Manually define the property on the event object before dispatching.

```javascript
const event = new Event('pointerdown', { bubbles: true });
Object.defineProperty(event, 'isTrusted', { value: true }); 
document.body.dispatchEvent(event);
```

### 🏗️ Lazy Mocking for Hoisted Constants

**Problem:** `jest.mock` is hoisted to the top of the file. Accessing `document` or `window` inside a mock factory throws a `ReferenceError` because the DOM isn't ready.

**Trick:** Move the DOM access inside a `mockImplementation` function so it is evaluated at runtime, not load-time.

```javascript
jest.mock('three', () => ({
  WebGLRenderer: jest.fn(() => ({
    domElement: document.createElement('canvas'), // ✅ Evaluated when called
  }))
}));
```

---

## 2. Web & Layout Testing (Playwright / UI Layer)

### 📏 Deterministic Viewports

**Problem:** Absolute coordinate tests fail because CI runners defaults differ from local machines.

**Trick:** Hardcode the viewport in `beforeEach` to match your "Gold Master" snapshots.

```javascript
test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 }); // iPhone 8 Standard
});
```

### ⏳ The "Animation Settle" Buffer

**Problem:** Playwright clicks a toggle, but asserts position while the CSS `transition` is still firing.

**Trick:** Use a timeout slightly longer than your CSS `transition-duration`.

```javascript
await page.locator('.toggle').click();
await page.waitForTimeout(600); // Buffer for 500ms CSS transition
```

### 🎯 Center-Aware Drag Math

**Problem:** Dragging an element to a coordinate often results in a "width-sized gap" because the mouse grabs the top-left or center.

**Trick:** Calculate the target center so the element's **edge** aligns with the container's **edge**.

```javascript
const targetX = containerBox.x + containerBox.width - (elementBox.width / 2);
const targetY = containerBox.y + containerBox.height - (elementBox.height / 2);
await page.mouse.move(targetX, targetY);
```

---

## 3. 3D, GLSL, and WebGL (Visual Regressions)

### 🐤 The "Canary Geometry" Exception

**Problem:** Curved geometries (like `CIRCLE`) produce anti-aliasing artifacts that differ between Chromium and Firefox, causing strict failures.

**Trick:** Relax thresholds exclusively for edge-heavy geometries while keeping strict checks for primitives.

```javascript
const threshold = shape === 'CIRCLE' ? 0.15 : 0.05;
await expect(canvas).toHaveScreenshot({ maxDiffPixelRatio: threshold });
```

### 🎨 Rendering Race Conditions

**Problem:** Taking a screenshot before the WebGL worker has pushed the final buffer results in a blank canvas.

**Trick:** Implement a `data-status` attribute on the canvas that the worker flips to "Stable" when the render loop is idle.

```javascript
await page.waitForSelector('canvas[data-status="stable"]');
await expect(canvas).toHaveScreenshot();
```

---

## 4. Negative Testing (Failure Mode Validation)

### 💥 Validating "Self-Healing" Logic

**Problem:** We need to ensure the UI doesn't crash when a user enters invalid math.

**Trick:** Inject an "Illegal Formula" and assert that the system reverts to the last known good state or displays a specific error UI.

```javascript
test('[failure-mode] should handle Division by Zero gracefully', async ({ page }) => {
  await page.fill('.formula-input', 'x = 10 / 0;');
  const status = page.locator('.Status_Indicator');
  await expect(status).toHaveClass(/Status_Error/);
  // Verify 3D engine is still responsive
  await expect(page.locator('canvas')).toBeVisible();
});
```

### 🛑 Worker Crash Recovery

**Problem:** If the Web Worker terminates, the app shouldn't hang.

**Trick:** Force a worker termination in the test environment and verify the "Nominal Health" indicator flips to "Critical".

```javascript
await page.evaluate(() => window.parametricWorker.terminate());
await expect(page.locator('.Health')).toHaveText('CRITICAL');
```

---

## 5. Performance & Unified Coverage

### 🎒 Decouple Coverage from Snapshots

**Problem:** Running coverage instrumentation during snapshot updates makes WebGL renders 5x slower.

**Trick:** Use environment variables to toggle coverage off during visual baseline updates.

```json
"test:update": "VITE_COVERAGE=false npx playwright test --update-snapshots",
"test:full": "VITE_COVERAGE=true npm run test:full-baseline"
```

### 🍱 Shard-Aware Merging

**Problem:** Large E2E suites fail to merge coverage if the browser closes too fast.

**Trick:** Implement a "Settle" buffer in the Playwright `afterEach` hook to ensure the `window.__coverage__` object is fully available for evaluation.

```javascript
afterEach(async ({ page }) => {
  if (process.env.VITE_COVERAGE) {
    await page.waitForTimeout(500); // 🛡️ WebKit Teardown Guard
    const coverage = await page.evaluate(() => window.__coverage__);
  }
});

---

## 6. Intent Tagging Protocol (Meta-Testing)

Every test must declare its intent using one of the following tags in the description. The test body must also contain implementation markers matching that intent.

| Tag | Meaning | Required Markers (Heuristics) |
| :--- | :--- | :--- |
| **`[behavior]`** | Validates a core user-facing feature or interaction. | `fireEvent`, `userEvent`, `click`, `fill`, `press`, `page.` |
| **`[policy]`** | Validates architectural rules or structural constraints. | `toThrow`, `ReadOnly`, `frozen`, `Boundary`, `expect.extend` |
| **`[failure-mode]`** | Validates resilience to invalid inputs or crashes. | `error`, `NaN`, `terminate`, `Infinity`, `invalid`, `spyOn` |

**Weak Assertions:**
Tests that only use "existence" checks (e.g., `toBeDefined`, `toBeTruthy`) are flagged as `[suspect]`. You must use at least one "Strong Assertion" (e.g., `toEqual`, `toContain`, `toThrow`).

**Example:**
```javascript
test('[behavior] clicking button updates count', () => {
  fireEvent.click(button); // Marker present
  expect(count).toBe(1);   // Strong assertion present
});
```
```

---

## 6. Meta-Test Addendum (Ensuring Test Quality)

### 🏷️ Suspect-Test Tagging Convention

**Purpose:**
Not all tests are equally valuable. To ensure tests validate **real decisions**, we tag every test with its intent:

| Tag              | Meaning                                                        | Example                                                        |
| ---------------- | -------------------------------------------------------------- | -------------------------------------------------------------- |
| `[behavior]`     | Confirms a behavior contract (expected state or UI change)     | `test('[behavior] tooltip shows on hover', () => { … })`       |
| `[policy]`       | Confirms a business or architectural policy decision           | `test('[policy] disallow negative dimensions', () => { … })`   |
| `[failure-mode]` | Confirms proper handling of a failure, crash, or invalid input | `test('[failure-mode] formula division by zero', () => { … })` |

> **Guiding principle:** Every test **must** have one of these tags. Tests without a tag are “suspect” and likely provide fake coverage.

---

### ⚙️ Enforcing Tags in Jest

**Custom test wrapper:**

```javascript
// test-utils/metaTest.js
export function testWithTag(tag, name, fn) {
  if (!['[behavior]', '[policy]', '[failure-mode]'].includes(tag)) {
    throw new Error(`Missing or invalid test tag for: ${name}`);
  }
  test(`${tag} ${name}`, fn);
}
```

**Usage:**

```javascript
import { testWithTag } from './test-utils/metaTest';

testWithTag('[behavior]', 'tooltip shows on hover', () => {
  // test logic here
});
```

**Optional warn/fail mode:**

```javascript
const MODE = process.env.TEST_TAG_MODE || 'warn'; // 'warn' or 'fail'

function testWithMetaCheck(tag, name, fn) {
  if (!tag) {
    const msg = `⚠️ Suspect test missing tag: ${name}`;
    if (MODE === 'fail') throw new Error(msg);
    else console.warn(msg);
  }
  test(`${tag || ''} ${name}`, fn);
}
```

---

### ⚡ Enforcing Tags in Playwright

**Extend Playwright test:**

```javascript
import { test as baseTest } from '@playwright/test';

export const test = baseTest.extend({
  metaTag: async ({}, use, testInfo) => {
    const tag = testInfo.annotations.find(a => a.type === 'tag')?.description;
    if (!tag) {
      const msg = `⚠️ Suspect test missing tag: ${testInfo.title}`;
      if (process.env.TEST_TAG_MODE === 'fail') throw new Error(msg);
      else console.warn(msg);
    }
    await use(tag);
  },
});
```

**Usage:**

```javascript
test('tooltip shows on hover', async ({ page }, testInfo) => {
  testInfo.annotations.push({ type: 'tag', description: '[behavior]' });
  // Playwright test logic here
});
```

---

### 🧪 Testing the Meta-Tests

1. **Create a “fake coverage” test** without a tag; it should trigger the warn/fail logic.
2. **Toggle modes:** run with `TEST_TAG_MODE=warn` and `TEST_TAG_MODE=fail`.
3. **Check CI integration:** missing tags should fail the CI pipeline in fail mode.
4. **Combine with coverage reports:** suspect tests often coincide with low-assertion coverage, providing a feedback loop.

---

### ✅ Benefits

* Prevents **fake coverage** from inflating metrics.
* Enforces **intentional, meaningful testing** across Jest and Playwright.
* Makes **test suites self-documenting**, so reviewers instantly know the purpose of each test.
* Works seamlessly with **meta-testing**, CI pipelines, and unified coverage reports.
