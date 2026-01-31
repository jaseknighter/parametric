# 📝 Project Scratchpad & Strategic Backlog

> "It is worse than chaos — it’s almost working." — *Anonymous LLM*

---

## 🚩 Pre-v0.5: The Baseline Anchor (Final Handshake)
- [x] Security Review: Final audit of Function constructor and string sanitization.
- [x] Mobile Optimization: Initial fix for viewport scaling and touch collisions.
- [x] Environment Cleaning: Diagnostic HUD excluded from production by default.
- [x] Documentation: Baseline versions of README.md, ARCHITECTURE.md, and TESTING.md (PST Verified).
- [x] CI Hardening: Implementation of the "Holding Area" artifact pattern to prevent report 404s.

## 📦 v0.5.x Patch Cycle (In Progress)
- [x] **v0.5.0.1:** Infrastructure Baseline (Feature Flags, Self-Healing, MVP Test)
- [ ] **v0.5.1:** Accessibility Hardening (ARIA, Roles, Live Regions) `[Flag: accessibilityHardening]` (Tests Defined)
- [x] **v0.5.2:** The Instructional Bridge (Math Tooltips, Registry Sync, KaTeX) `[Flag: docsBridge]`
- [x] **v0.5.3:** Mobile HUD & Interaction (Bottom Dock, Micro-HUD, Pinch-Guard) `[Flag: mobileHudOptimization]`

---

## 🛰️ Post-v0.5: Fidelity & Observability

### 0. Lockdown for Reporting (Sustainable Automation)
- [ ] Implement a Single Source of Truth for Paths: Migrate report folder names and URLs into a centralized /src/shared/paths.js to be shared by Node scripts and CI YAML.
- [ ] Enforce Slot Markers: Hard-code the use of markers in all README update scripts to prevent accidental overwriting of manual prose.
- [ ] Automated CI/Workflow Contract: Update YAML to read folder names directly from environment variables or shared constants rather than hardcoded strings.
- [ ] Explicit Skipped Test Handling: Standardize the logic that treats "Skipped" as "Passed" across the generator script and the README narrative for 100% transparency.
- [ ] Preflight Linting: Add a bash/Node preflight check to the workflow that validates folder existence and URL integrity before the final deployment.
- [ ] Document Snapshot Policy: Explain the "Linux-as-Truth" / Shared Baseline strategy so contributors don't fight rendering differences.

### 1. Narratives for Test Results (The "Quality Narrative")
- [ ] Inject Domain Descriptions: Update the coverage table generator to include static "Why this matters" context for Services, Web Workers, and Logic layers.
- [ ] Intelligent Result Analysis: Add logic to generate a summary paragraph in the README that "reads" the coverage numbers and provides a status insight (e.g., "Gold Standard" vs "At Risk").
- [ ] Contextual Deep-Links: Include a link in the README to an 'ABOUT_COVERAGE.md' that explains the mathematical importance of high coverage in a 3D environment.


### 2. Drift Exorcism (Mathematical Fidelity)
- [ ] Synchronize Global Math Scope: Verify that both the Main Thread and Web Worker have access to identical constants (π, e, etc.) to eliminate precision deltas.
- [ ] Math.js Precision Alignment: Standardize the mathjs configuration across both "brains" to ensure floating-point entropy is handled identically.
- [ ] Resolve Test #40 Regression: Explicitly fix the delta issue where Local results (-5) differed from Worker results (0) for identical formulas.
- [ ] Numerical Drift Audit Tool: Implement a permanent "Observer Standard" test that flags any coordinate divergence greater than 0.000001 between threads.

### 3. Blue/Green Deployment & Rollbacks
- [ ] Blue/Green Staging Validation: Restructure the workflow to deploy to a staging sub-path or branch and run live E2E tests before updating the main site.
- [ ] Automated Rollback Logic: Implement a failure-triggered job that re-deploys the last known successful Artifact ID if live site validation fails.
- [ ] Manual Revert Strategy: Document the process for using GitHub Environments to "Rewind" the site to a previous deployment via the Actions tab.
- [ ] Versioned URL Structure: Implement a folder-based versioning system (e.g., /v0.5.0/index.html) so previous iterations remain reachable and hosted.
- [ ] Smoke Test Prod: Add a final YAML job that uses curl to verify a 200 OK status on the live URL after the deployment is marked complete.

### 4. Accessibility & UI Universalization
- [ ] HUD Screen Reader Support: Implement ARIA-live regions for formula validation errors so non-visual users receive immediate feedback on syntax errors.
- [ ] Focus Management: Ensure that opening/closing drawers and HUD windows moves focus correctly to prevent "Focus Traps" for keyboard-only users.
- [ ] Semantic Math: Explore the use of MathML or hidden descriptive text for formulas to describe the geometric transformations to assistive technology.
- [ ] High-Contrast Canvas Guard: Implement a feature to toggle high-contrast vertex colors to improve visibility for users with visual impairments.
- [ ] State Serialization (Social Math): Inject interface and HUD custom formulas into the URL to enable sharing and saving of shapes.

### 5. Git Automation & Migration
- [ ] Templated Issue Creation: Establish GitHub Issue Templates (.github/ISSUE_TEMPLATE/) for Bug Reports and Feature Requests to ensure consistent data collection.
- [ ] Retrospective Issue Generation: Scripted creation of resolved GitHub issues based on analysis of the repository's commit history to backfill the project board.
- [ ] Git-Based Issue Lifecycle: Develop a script or workflow that allows creating, labeling, and closing issues directly from Git commit messages (e.g., "resolves #123").
- [ ] Pull Request Automation: Implement a PR template that automatically runs the "Numerical Drift" audit and requires a "Green" status before allowing a merge.
- [ ] Project Board Sync: Configure a GitHub Project to automatically move issues to "Done" when the corresponding branch is merged into main.
- [ ] Dev Test Results in README: Update the coverage table generator to include local development test results in the README.md report, providing visibility into pre-commit validation status.

### 6. Architectural Integrity & Heritage
- [ ] Issue Externalization: Move all items from this scratchpad into individual GitHub Issues with labels for debt, feature, and stability.
- [ ] Archive Legacy Code: Preserve the original 2019 CRA source code in a dedicated orphan branch (legacy/original-2019).
- [ ] The DOM Purge: Remove remaining non-React direct DOM manipulations hidden in legacy helpers.
- [ ] Framework Decoupling: Define a strict API between the React UI and the Vanilla 3D engine to enable future framework-agnostic usage.
- [ ] Documentation Restructuring: Reorganize `/docs` into the Quad-Pillar structure (`architecture`, `dev`, `ops`, `testing`) as defined in the manifest.
- [ ] Clean up CSS and GUI constraint logic: Centralize boundary enforcement (HUD, Feature Flags) and refactor CSS for cleaner layout ownership.
- [ ] Create `getDockingBounds()` test helper: Standardize boundary verification for FeatureFlag GUI and Formula HUD tests to avoid duplicated logic.
- [x] Create `expectInterfaceCollapsed()` test helper: Standardize assertions for Micro-Nav collapse state (pointer-events, opacity) to avoid brittle visibility checks. (Completed in v0.5.3)
- [x] **Manual Mode Invariance:** Implement an "Inertial Authority" guard at the shape-change emitter level to prevent generated formulas from overwriting user-authored manual overrides.
- [x] **Geometry Explosion Guard:** Implemented asymptotic bounding for Pinch and a global viewport safety clamp to prevent vertices from exceeding the camera frustum.
- [ ] **Memory Leak Cleanup:** Fix "Can't perform a React state update on an unmounted component" warning in `Parametric.js` by clearing `debouncedLayoutRef` in the effect cleanup.
- [ ] **CSS Architecture Audit:** Identify which JS-injected styles are hydration-critical (Safari / initial load) vs. candidates for migration back to `Parametric.css`. Also perform a more general review of the architecture.
- [ ] **Meta-Testing Formalization:** Transition the Meta-Testing PoC into a production-grade "Quality Autopilot" by integrating AST-based analysis (ESLint) and expanding heuristic definitions.
- [ ] **Meta-Testing (AUTOMATED) Governance (Post-Implementation):**
    - [ ] Enforce: No checkins > X lines of code without new/updated test cases.
    - [ ] Enforce: No checkins > X lines of code without new/updated meta-testing tags.
    - [ ] Enforce: No checkins > X lines of code AND no testing updates > X lines without a testing/meta-testing requirements spec created/updated.
    - [ ] Enhance: Update meta-testing/meta-meta-testing to evaluate test adequacy (are intents fully covered? are Jest/Playwright tests sufficient for the complexity?).
- [ ] **Mobile Test Refactoring:**
    - [ ] Refactor `verifyPosition()` in `mobile-hud.spec.js` into a semantic geometry helper.
    - [ ] Tag mobile tests as **UX invariants**.
    - [ ] Split mobile HUD tests into layout vs interaction layers.

### 7. Instructional Refinement (Future)
- [x] Keyboard / focus-triggered tooltips: Ensure tooltips appear when focusing on controls via keyboard.
- [x] `role="tooltip"` + `aria-hidden`: Enhance accessibility compliance for custom tooltips. (Completed in v0.5.2)
- [ ] Centralized TooltipManager (single portal): Move tooltip rendering to a top-level portal to avoid z-index and overflow issues.
- [ ] HUD math tooltip parity: Implement the same KaTeX tooltip system for the HUD formula editor variables.
- [ ] Tooltip Math Visualizer: Implement interactive, visual explanations of mathematical formulas in tooltips. See [Draft Spec](./drafts/TOOLTIP_MATH_VISUALIZER.md).
- [ ] **Mobile Tooltips:** Re-enable tooltips on mobile once a robust dismissal strategy (tap-to-dismiss or timeout) is implemented.