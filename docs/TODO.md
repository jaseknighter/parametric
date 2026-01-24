<!-- TODO.md -->

# 📝 Project Scratchpad & Strategic Backlog

> "It is worse than chaos — it’s almost working." — *Anonymous LLM*

---

## 🚩 Pre-v0.5: Final Hardening (The Baseline)
*Critical tasks required to stabilize the rearchitecture for public release.*

- [x] **Security Review:** Perform a final audit of the `Function` constructor and string sanitization paths.
- [X] **Mobile Optimization:** Fix viewport scaling and touch-event collisions for the geometry canvas.
- [x] **Environment Cleaning:** Ensure the Diagnostic HUD is excluded or disabled by default in the production build.
- [ ] **Documentation:** Finalize and commit `README.md`, `ARCHITECTURE.md`, and `TESTING.md`.

---

## 🛰️ Post-v0.5: Fidelity & Observability
*Transitioning from "Does it work?" to "Is it right?" and "Is it stable?"*

### 0. Migrate issues/features out of this list and start addressing them
- [ ] **Start using GitHub issues:** Move items from this list into GitHub Issues.
### 1. Architectural Integrity & Debt
- [ ] **Create some kind of blue/green deployment process** 
- [ ] **Mobile Optimization:** Fix typography and controls overlapping the HUD.
- [ ] **Separation of Concerns Audit:** Review code against specs to fix gaps; specifically, move remaining business logic out of the Worker thread.
- [ ] **"The Exorcism":** Identify and remove any legacy non-React DOM manipulations or "lingering" 2019-era logic.
- [ ] **Magic Number Cleanup:** Abstract hardcoded values (e.g., `radius = 5`) into a centralized constants/config file.
- [ ] **Brittle Code Pass:** Replace silent null-fallbacks with explicit warnings:
  > `console.warn('[VariableBridge] Received null/undefined vectorParams. Falling back to identity (0).');`
- [ ] **Code reorganization:** Move non-container code out of `/containers` and into more logical locations (e.g. `/logic`, `/workers`, etc.).

### 2. Testing
- [ ] **Test Performance Optomization**: improve how tests are run so they aren't slowed down unecessarily (e.g. for overly long timeouts).
- [ ] **Numerical Accuracy:** Update tests to move beyond existence checks (e.g., replace `not.toBe(0)` with actual expected slider values).
- [ ] **Architectural Guards:** Implement compliance tests:
  - `test('Security Guard: getFormulaExecutionScope must filter unknown keys')`
  - `test('Architectural Guard: assertReadOnly must throw on mutation')`
- [ ] **Test Externalization:** Move test expectations into a configuration file for easier review and updates.
- [ ] **Dynamic smoke tests:** Update Playwright to autogenerate test cases based on JSON shape schemas.
- [x] **Cross-Browser Smoke Suite:** Configured WebKit & Firefox runners for critical path (HUD/Canvas).
- [ ] **Mobile Validation:** Add automated UI tests specifically for mobile breakpoints and interactions.

### 3. Antifragility, Performance & Observability
- [ ] **Remove things that hide fragility:** for example, adding a ternary test for `null` when setting a variable rather than allowing things to fail to surface underlying problems
- [ ] **Final Performance Benchmarking:** Establish the "Vertex Ceiling" for desktop vs. mobile.
- [ ] **Live Telemetry:** Implement the Grafana/Loki observability bridge.
- [ ] **HUD Refinement:** Add a "Minimize" feature to the Diagnostic HUD to prevent UI clutter.

### 4. Project Heritage & Cleanup
- [ ] **Archive Legacy Code:** Preserve the original 2019 source in an orphan branch:
  ```bash
  git checkout --orphan legacy/original-2019
  git rm -rf .
  # (Copy 2019 files into the folder)
  git add .
  git commit -m "ARCHIVE: Preserve original 2019 source code"
  git push origin legacy/original-2019
  git checkout main

### 5. Other stuff
 - [ ] **Decoupling from React:** explore how to "decouple" the React UI even further from the Vanilla Engine to ensure the core math is 100% framework-agnostic