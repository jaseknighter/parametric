# RELEASE MANIFEST VERSION 0.5: The Unified Engine Baseline

**NOTE: AI generated, still under review.**

## Table of Contents
- [RELEASE MANIFEST VERSION 0.5: The Unified Engine Baseline](#release-manifest-version-05-the-unified-engine-baseline)
  - [Table of Contents](#table-of-contents)
    - [1. The Architectural Shift: Main Thread to Worker](#1-the-architectural-shift-main-thread-to-worker)
    - [2. The JIT Formula Engine (Math Authority)](#2-the-jit-formula-engine-math-authority)
    - [3. Security \& Execution Sandboxing (The "Defense in Depth")](#3-security--execution-sandboxing-the-defense-in-depth)
    - [4. Transactional Integrity, Reliability \& Quality](#4-transactional-integrity-reliability--quality)
    - [5. Interaction and UX](#5-interaction-and-ux)
    - [6. Documentation and Governance](#6-documentation-and-governance)
  - [Post-v0.5 Priorities: Transparency \& Test Depth](#post-v05-priorities-transparency--test-depth)
    - [1. Observability (The "Black Box")](#1-observability-the-black-box)
    - [2. Quality of Quality (Validation Depth)](#2-quality-of-quality-validation-depth)
    - [**Known Limitations**](#known-limitations)

This document defines the non-negotiable architectural rules introduced in v0.5.

The v0.5 release represents a significant rearchitecture of the core engine. This iteration moves the project away from monolithic logic toward a structure governed by **Foundational Invariants**—immutable system properties that must never be violated regardless of UI state, input timing, or execution order.

**Note on Scope:** This is an internal "Core Transplant." While the processing logic has been entirely rebuilt, the **UI/UX layers** and the **Data Schema** driving the UI remain unchanged to ensure stability and backwards compatibility. The sole exception is the **HUD**, introduced in this release to provide transparency into shape generation and offer expanded, discrete control. By enabling direct code editing alongside traditional sliders, the HUD shifts the user from a "shape explorer" to a more deeply engaged "mathematical author."

### 1. The Architectural Shift: Main Thread to Worker
A fundamental separation of calculation logic from the rendering thread has been established, aiming to ensure a more responsive user interface under heavy computational loads.

* **Asynchronous Geometry Pipeline:** The migration from blocking main-thread calculations to a Request-Response model is intended to prevent UI freezing during complex renders.

* **Zero-Copy Memory Transfer:** The implementation of `ArrayBuffer` transfers for 3D datasets seeks to minimize latency by transferring ownership of memory rather than cloning data.
* **Worker Watchdog & Busy Gates:** The integration of a 2s "Hang Monitor" and a 50ms throttle gate serves as a safeguard to help the UI remain interactive even when formula complexity spikes.

---

### 2. The JIT Formula Engine (Math Authority)
The engine has been redesigned as a live compiler, allowing for flexible mathematical exploration through dynamic instruction sets.

* **Symbolic Pipeline Simulation:** The HUD now performs a sequential simulation of the transformation pipeline ($Bend \to Spiral \to Texture \to Post-Process$) to ensure the displayed formula matches the Worker's compiled kernel.
* **Lexical Authority & Hybrid Scope:** A strict authority hierarchy ensures that user-typed assignments (e.g., `pinchAmtX = 12.34`) explicitly override scoped slider variables within the Worker.
* **Mathematical Safety (The Null-Gate):** `safeDiv` and `safeTan` wrappers are integrated within a telemetry-backed safety fallback. The system is designed to detect malformed state packets and falls back to identity (0) rather than crashing the browser.

---

### 3. Security & Execution Sandboxing (The "Defense in Depth")
To protect the host environment from potentially malicious mathematical scripts, v0.5 introduces a multi-layered security model.

* **Isolated Context:** JIT execution is confined strictly to the Web Worker, which lacks access to the DOM, `localStorage`, and sensitive global objects.
* **Keyword Sanitization:** A proactive regex filter blocks prohibited JavaScript keywords (e.g., `eval`, `fetch`, `XMLHttpRequest`, `window`) before they reach the `Function` constructor.

* **Worker Feedback Loop:** An error-propagation bridge ensures that any security violation detected within the worker is surfaced to the main thread, immediately flagging the HUD status as "Invalid."

---

### 4. Transactional Integrity, Reliability & Quality
v0.5 establishes a formal testing baseline to manage the complexity of LLM-assisted development and support long-term stability.
* **The "All-or-Nothing" Rule (Atomic Sync):** An implementation of the Invariant principle ensuring the engine must update every point in a mesh at the same time. This prevents "glitchy" intermediate states during high-speed parameter shifts or formula swaps.
* **Unified Coverage Pipeline:** Over one hundred automated Playwright tests verify system integrity. Jest and Playwright reports are merged into a "Single Pane of Glass" via Monocart.
* **Observer Standard Validation:** Rigorous "Precision Shadowing" tests ensure that UI interactions (focusing, dragging, clicking) are mathematically silent and do not deform the geometry.
* **The 80% Threshold:** A baseline of >80% Statement Coverage is established as a prerequisite for the v0.5 tag, providing a clear metric for project health.


---

### 5. Interaction and UX
* **In-Place Buffer Streaming:** Optimized `.set()` updates for `TypedArrays` aim to reduce Garbage Collection stutter during high-speed parameter changes.
* **Atomic Multi-Axis Sync:** Batch intent dispatching for complex deformations ensures that multi-axis changes are processed as a single, atomic state change (Single RID).

---

### 6. Documentation and Governance
For a deep dive into the logic behind these changes, please refer to the following repository documents:

* [Release Manifest v0.5 (DRAFT)](./docs/drafts/MANIFESTS/MANIFEST_VERSION_0.5.md)
* [Architecture Specs (DRAFT)](./docs/drafts/ARCHITECTURE.md)
* [Parametric Authority (DRAFT)](./docs/drafts/PARAMETRIC_AUTHORITY.md)
* [Design Patterns (DRAFT)](./docs/drafts/DESIGN_PATTERNS.md)
* [Implementation Notes (DRAFT)](./docs/drafts/IMPLEMENTATION_NOTES.md)
* [Glossary (DRAFT)](./docs/drafts/GLOSSARY.md)

## Post-v0.5 Priorities: Transparency & Test Depth
With the **Engine's structure** established in v0.5, the priority for subsequent release cycles shifts toward deep-system visibility and refined validation.

### 1. Observability (The "Black Box")
The next phase focuses on an infrastructure to provide insights into engine performance across diverse environments.
* **Internal Telemetry:** Potential integration with Grafana Cloud to monitor "Poison Formulas" and worker performance metrics.
* **Global Error Boundaries:** Implementation of crash-catching mechanisms to help mitigate the "White Screen of Death" and capture post-mortem data.

### 2. Quality of Quality (Validation Depth)
The current testing suite focuses on **existence**; the next priority is to advance toward **accuracy**.
* **Predicate-Based Testing:** Moving beyond checking for "truthy" values to verifying specific numerical ranges and vertex distributions.
* **Snapshot Regression:** Implementing visual and data-state snapshots to ensure that identical formulas yield identical results across different browser engines.
* **Boundary Case Hardening:** Focusing automated tests on the "edges" of mathematical stability to ensure that $0$, $\infty$, and $NaN$ are handled with precision.

---

### **Known Limitations**
As this rearchitecture is still maturing, users may encounter edge cases in worker synchronization or unexpected behavior in complex nested formulas. Ongoing refinement is expected as part of the post-v0.5 roadmap.