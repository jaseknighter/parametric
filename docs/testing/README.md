# Testing Approach in the Parametric Geometry Project

The testing strategy in this project leverages **Vite + Playwright + Three.js** to make asynchronous rendering and scene graph state **deterministic and testable**. The approach focuses on ensuring that tests only proceed once the **3D scene and renderer are fully initialized**, while also capturing **coverage across both Node and browser contexts**.

---

## **1️⃣ Global readiness flags for complex renderers**

* The project uses global flags such as:

```ts
window.__PARAMETRIC_READY__ === true
window.__HUD_READY__ === true
```

* Tests wait for these flags before performing assertions:

```ts
await page.waitForFunction(() => window.__PARAMETRIC_READY__ === true, { timeout: 90000 });
```

* This ensures that tests **only run after the entire 3D scene is ready**, avoiding flakiness caused by partial renders or asynchronous Three.js initialization.

---

## **2️⃣ Software WebGL fallback for CI**

* Configured to work with **software-rendered WebGL** (e.g., SwiftShader) for environments without a GPU.
* Jest canvas mocking allows logic and scene initialization to run **headlessly in Node**:

```ts
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({ ... }));
```

* This enables **full 3D scene testing in CI** environments, which is not common in typical production Three.js apps.

---

## **3️⃣ Vite dev server integration with Playwright**

* Tests run against a **live Vite dev server**, not just static builds:

```
http://localhost:5173/
```

* Enables **fast ESM reloads** and deterministic access to renderer state.
* Pixel-difference thresholds (`maxDiffPixelRatio`) are used to tolerate OS-level anti-aliasing variations, improving test stability.

---

## **4️⃣ Scene graph structural testing**

* Tests validate **semantic invariants of the scene** rather than relying solely on screenshots or visual regression:

  * Rails or tracks count
  * Pulses spanning rows correctly
  * Luminance hierarchy (pulses darker than rails)
  * Contiguous identity spans

* This represents **structural testing of the 3D scene graph**, ensuring meaningful correctness of the scene beyond just rendered output.

---

## **5️⃣ Coverage-driven E2E testing**

* Setting `VITE_COVERAGE=true` enables **coverage collection for both Node and browser-executed rendering code**.

* Coverage is merged from:

  * Jest (Node logic)
  * Playwright (browser / rendering logic)

* This allows capturing **end-to-end coverage** across both application logic and live Three.js rendering, which is rarely done in typical 3D apps.

---

## **6️⃣ Deterministic handling of asynchronous rendering**

* Extensive use of `page.waitForFunction()` ensures:

  * Tests run only after the renderer is fully populated
  * Avoids flakiness caused by GPU timing or frame drops
  * Scene graph state is consistent before assertions

* Wait patterns often reference specific scene readiness flags or service states:

```ts
await page.waitForFunction(() => window.scene && window.intentService, { timeout: 5000 });
await page.waitForFunction(() => window.__PARAMETRIC_READY__ === true, { timeout: 90000 });
```

---

## **Workflow Diagram**

```mermaid
flowchart TD
    A[Vite Dev Server / Live ESM] --> B[Browser Launch (Playwright)]
    B --> C{Renderer Initialization}
    C -->|Scene Ready| D[Global __PARAMETRIC_READY__ Flag]
    D --> E[Test Waits for Flag]
    E --> F[Test Assertions on Scene Graph]
    C -->|Partial/Slow Render| G[Timeout / Retry]
    
    subgraph Coverage
        H[Jest Node Coverage] --> I[Merge]
        J[Playwright Browser Coverage] --> I
        I --> K[Unified Coverage Report]
    end
```

**Explanation:**

1. Vite serves the live ESM build.
2. Playwright launches a browser and waits for renderer initialization.
3. Global readiness flags indicate when the scene is fully ready.
4. Tests only proceed once the flag is set.
5. Jest and Playwright coverage are merged into a **single unified report**, capturing both logic and rendering coverage.

---

### ✅ **Summary of Test Strategy Features**

| Feature                            | Purpose / Implementation                                      |
| ---------------------------------- | ------------------------------------------------------------- |
| Global `__READY__` flags           | Guarantees fully initialized renderer for deterministic tests |
| Software WebGL / canvas mocking    | Allows CI to run full 3D tests without a GPU                  |
| Vite dev server + E2E              | Live reload + deterministic testing of complex scenes         |
| Scene graph invariant checks       | Structural testing beyond snapshots or screenshots            |
| Coverage merge from browser + Node | Captures code coverage for both rendering and logic           |
| Deterministic async handling       | Avoids flaky tests due to GPU timing or frame drops           |

---

This document describes the **testing implementation** for the Parametric Geometry Project, showing how **Vite, Playwright, and Three.js** are orchestrated to achieve deterministic and fully instrumented end-to-end testing.

---

If you want, I can also produce a **reusable utility for the readiness wait patterns** (`page.waitForFunction`) to simplify these checks across all tests — this would reduce repeated boilerplate and make the tests cleaner.

Do you want me to do that next?
