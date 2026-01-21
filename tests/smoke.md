# 📂 Suite: Parametric System Integrity (SMOKE)
**Phase:** Intent Service Phase 4 (Integration & GPU Sync)  
**Status:** Verified (100% Pass Rate)  
**Execution Time:** ~7.9s  

## 🎯 Purpose
This suite validates the overall health, GPU propagation, interactive sliders, shape library, projections, textures, and STL export of the parametric system. It is designed to ensure that the **Intent Service** state remains the "source of truth" and correctly drives the **Three.js** rendering engine.

---

## 🚀 Execution Guide

### Running Tests (Local)
| Task | Command |
| :--- | :--- |
| **All Tests (Headless)** | `npx playwright test` |
| **All Tests (Visible/Headed)** | `npx playwright test --headed` |
| **Single Test (by name)** | `npx playwright test -g "should match gold master"` |
| **Single File** | `npx playwright test tests/smoke.spec.js` |
| **Debug Mode** | `npx playwright test --debug` |

### Visual Regression & Reports
| Task | Command |
| :--- | :--- |
| **Create/Update Gold Masters** | `npx playwright test --update-snapshots` |
| **View Last Test Report** | `npx playwright show-report` |

### CI/CD (GitHub Actions)
The suite runs automatically on every **Push** or **Pull Request**.
* **Workflow Logic:** Installs Node.js, system dependencies, and Playwright browsers.
* **Artifacts:** If a test fails, the HTML report and failure screenshots are uploaded to the "Actions" tab.



---

## 🛠 Test Domains & Validation Logic

### 1. Startup / Health Check
* **Test:** `should report NOMINAL health on startup`
* **Method:** Queries the system "Oracle" for internal service status.
* **Checks:**
    * `window.getSystemHealth()` returns `success: true`.
    * Header diagnostic square matches `rgb(126, 163, 143)` (Sage Green).

### 2. GPU Handshake
* **Test:** `should propagate pinchAmtX from Service to Three.js Uniforms`
* **Method:** Injects values into `intentService` and traverses the Three.js `Scene` for mesh material.
* **Checks:**
    * Setting `pinchAmtX` via the service propagates to live material uniforms.
    * Confirms engine synchronization with service state.

### 3. Interactive Vector Slider Controls
* **Controls:** `PINCH`, `BEND`, `SPIRAL`, `MODULATE`, `FLATTEN` (X, Y, Z axes).
* **Method:** Simulates vertical mouse drag on slider rails.
* **Checks:**
    * Clicking the control stripe opens the UI (Waits for `.Controls_Show`).
    * Dragging sliders updates GPU uniforms/service state to non-zero values.

### 4. Shape Selection & Library
* **Shapes:** `SINE`, `CIRCLE`, `SEASHELL`, `MOBIUS`, `KLEIN`, `FRACTAL`.
* **Method:** Standardized selection via `validateShape` helper.
* **Checks:**
    * Selecting a shape updates the `formula` in `intentService.state`.
    * Geometry vertex count (`vCount`) is confirmed $> 0$ on the GPU.
    * **Visual Regression:** Pixel-match for **SEASHELL** against `seashell-gold-master.png`.



### 5. Projection Matrix Stress Test
* **Test:** `should maintain system stability when toggling all 9 projection axes`
* **Method:** Iterates through the 3x3 projection grid (Columns × Axes).
* **Checks:**
    * Validates `vectors` array in service state remains length 3.
    * Verifies geometry remains intact after rapid 3D-to-2D transitions.

### 6. Texture Slider Interaction
* **Test:** `should update engine to use a selected texture radius`
* **Key Path:** `innerTextureAmt`.
* **Checks:**
    * Moving the texture slider updates the corresponding GPU uniform.

### 7. STL Export
* **Test:** `should generate STL and cleanup temporary files`
* **Method:** Triggers export sequence and intercepts the browser download event.
* **Checks:**
    * Confirms download of `parametric.stl`.
    * Deletes temporary files after the test completes.

---

## 📝 General Implementation Notes
* **Locators:** Uses `data-testid` attributes extensively.
* **Interactions:** Includes `hover`, `drag`, and `force-click` for high-fidelity simulation.
* **Context Preservation:** Explicitly waits for hydration and CSS transition completion.
* **Performance:** Optimized for 5 workers with 10s timeouts for geometry-heavy operations.