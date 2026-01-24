# RELEASE MANIFEST VERSION 0.5: The Unified Engine Baseline

**NOTE: AI generated, still under review.**

## Table of Contents
- [RELEASE MANIFEST VERSION 0.5: The Unified Engine Baseline](#release-manifest-version-05-the-unified-engine-baseline)
  - [Table of Contents](#table-of-contents)
    - [1. The Architectural Shift: Main Thread to Worker](#1-the-architectural-shift-main-thread-to-worker)
    - [2. The JIT Formula Engine (Math Authority)](#2-the-jit-formula-engine-math-authority)
    - [3. Security \& Execution Sandboxing](#3-security--execution-sandboxing)
    - [4. Transactional Integrity \& Deterministic Testing](#4-transactional-integrity--deterministic-testing)
    - [5. Interaction and UX](#5-interaction-and-ux)
    - [6. Documentation and Governance](#6-documentation-and-governance)
  - [Post-v0.5 Priorities: Transparency \& Test Depth](#post-v05-priorities-transparency--test-depth)
    - [**Known Limitations**](#known-limitations)

---

### 1. The Architectural Shift: Main Thread to Worker
A fundamental separation of calculation logic from the rendering thread has been established to ensure a responsive UI under heavy computational loads.

* **Asynchronous Geometry Pipeline:** Migration from blocking main-thread calculations to a Request-Response model prevents UI freezing during complex renders.
* **Zero-Copy Memory Transfer:** Implementation of `ArrayBuffer` transfers for 3D datasets minimizes latency by transferring ownership of memory rather than cloning data.
* **Worker Watchdog & Busy Gates:** Integration of a 2s "Hang Monitor" and a 50ms throttle gate safeguards UI interactivity during formula complexity spikes.

---

### 2. The JIT Formula Engine (Math Authority)
The engine is now a live compiler, allowing for flexible mathematical exploration through dynamic instruction sets.

* **Symbolic Pipeline Simulation:** The HUD performs a sequential simulation of the transformation pipeline ($Bend \to Spiral \to Texture \to Post-Process$) to ensure the displayed formula matches the Worker's compiled kernel.
* **Lexical Authority & Hybrid Scope:** A strict authority hierarchy ensures that user-typed assignments explicitly override scoped slider variables within the Worker.
* **Mathematical Safety (The Null-Gate):** Internal `safeDiv` and `safeTan` wrappers are integrated within a telemetry-backed safety fallback, preventing browser crashes on $1/0$ or $NaN$ results.

---

### 3. Security & Execution Sandboxing
To protect the host environment from potentially malicious mathematical scripts, v0.5 introduces a multi-layered security model.

* **Isolated Context:** JIT execution is confined strictly to the Web Worker, which lacks access to the DOM and global sensitive objects.
* **Keyword Sanitization:** A proactive regex filter blocks prohibited JavaScript keywords (e.g., `eval`, `fetch`, `window`) before they reach the `Function` constructor.
* **Validation Bridge:** Any security violation detected within the worker is surfaced to the main thread, immediately flagging the HUD status as "Invalid."

---

### 4. Transactional Integrity & Deterministic Testing
v0.5 establishes a formal, deterministic testing baseline that eliminates environment-based "flakiness."

* **Deterministic Worker Handshake:** Testing is governed by a signal-driven architecture (`window.__PARAMETRIC_READY__`). The test suite synchronizes directly with the Worker’s internal readiness state, ensuring interactions only occur after a successful first-frame render.
* **Environmental Patience Buffers:** A 90-second "Soak Time" is established for software-rendered CI environments (Linux/Firefox/WebKit) to ensure baseline visual snapshots are captured with 100% reliability.
* **Unified Coverage (The 80% Rule):** Reached ~89% Statement Coverage across the entire codebase. Jest and Playwright reports are merged into a "Single Pane of Glass" via Monocart, verified through a "Settle Guard" to prevent shard data loss.
* **Observer Standard Validation:** "Precision Shadowing" tests ensure that UI interactions (focusing, dragging, clicking) are mathematically silent and do not deform the geometry during diagnostic monitoring.



---

### 5. Interaction and UX
* **In-Place Buffer Streaming:** Optimized `.set()` updates for `TypedArrays` reduce Garbage Collection stutter during high-speed parameter changes.
* **Atomic Multi-Axis Sync:** Batch intent dispatching ensures that multi-axis changes (e.g., Shift+Drag) are processed as a single, atomic state change (Single RID).

---

### 6. Documentation and Governance
This release is governed by the following core documents:

* [Architecture Specs](./docs/ARCHITECTURE.md)
* [Parametric Authority](./docs/PARAMETRIC_AUTHORITY.md)
* [Design Patterns](./docs/DESIGN_PATTERNS.md)
* [Implementation Notes](./docs/IMPLEMENTATION_NOTES.md)

---

## Post-v0.5 Priorities: Transparency & Test Depth
1. **Observability (The "Black Box"):** Infrastructure to provide insights into engine performance and "Poison Formula" detection.
2. **Quality of Quality (Validation Depth):** Moving from "Existence" testing to "Accuracy" testing (Predicate-based validation of vertex distributions).
3. **Snapshot Regression:** Hardening visual snapshots across diverse engine configurations.

### **Known Limitations**
* **CI Execution Latency (Firefox/Linux):** Due to software-based WebGL emulation on virtualized runners, the engine requires a significant "warm-up" period. 
* **Cumulative Test Duration:** While the 90s handshake buffer ensures reliability, heavy UI tests consistently utilize the full 90s window (1.5m) to resolve the first-frame render. Total CI suite duration for Firefox is significantly elevated compared to local execution.