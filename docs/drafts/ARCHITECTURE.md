# Architecture Specs: Parametric Authority (DRAFT)

**NOTE: AI generated, still under review.**

While the Implementation Notes provide the developer's guide, these Architectural Specifications serve as the enforceable rules for testing and system evolution.

## Table of Contents
- [Architecture Specs: Parametric Authority (DRAFT)](#architecture-specs-parametric-authority-draft)
  - [Spec 1: RID Pipeline & Monotonicity](#spec-1-rid-pipeline--monotonicity)
  - [Spec 2: Formula Invalidation & Structural Integrity](#spec-2-formula-invalidation--structural-integrity)
  - [Spec 3: Coordinate Normalization & Scaling](#spec-3-coordinate-normalization--scaling)
  - [Spec 4: Buffer Ownership & Flyweight Lifecycle](#spec-4-buffer-ownership--flyweight-lifecycle)
  - [Spec 5: Layout Authority & Epistemic Decoupling](#spec-5-layout-authority--epistemic-decoupling)
  - [Change Control](#change-control)
  - [Status](#status)

---

## Spec 1: RID Pipeline & Monotonicity
**Context:** Implementation Notes 1a & 1b

### Background
The transition from timestamp-based ordering to a Monotonic Request ID (RID) was required to eliminate "Ghost Frames" where stale data occasionally overwrote newer updates due to variable Worker processing speeds. Under high-frequency interaction, asynchronous results would return out of sequence, leading to visual "rubber-banding" in the 3D scene.

### Summary
This specification codifies a strictly increasing sequence contract and a backpressure gate (Reactive Pull). It prevents synchronization ambiguity during rapid user input by ensuring only the latest "Unit of Work" is committed to the renderer.

### Authority
* **Authoritative Source:** The UI Layer (`ridCounterRef`).
* **Non-authoritative Observers:** Web Worker, Parametric Manager.
* **Write Permissions:** Restricted solely to UI Thread handlers.

### Contract
1.  **The Monotonic Fence:** The `ParametricManager` must discard any incoming packet where `RID <= highestRidProcessed`.
2.  **The Chain of Custody:** The Web Worker must echo the exact RID received in the input packet back in the output result.
3.  **The Reactive Pull Gate:** The `isWorkerBusy` flag must be set to true immediately upon `postMessage` and cannot be released until a result is received. No new packets may be shipped while this gate is locked.

### Forbidden Behavior
* The Web Worker must never generate, modify, or increment a RID.
* The Manager must never decrement the `highestRidProcessed` value.

---

## Spec 2: Formula Invalidation & Structural Integrity
**Context:** Implementation Notes 2

### Background
This specification exists to prevent "Render Storms" caused by unnecessary regex-heavy formula reconstruction. Initial development showed that string concatenation and regex on the main thread during 60fps interaction led to dropped frames and high CPU heat.

### Summary
This specification codifies the Structural vs. Parametric separation. It ensures the main thread remains responsive by caching mathematical strings and only updating the numeric "Scope" for standard interactions.

### Authority
* **Authoritative Source:** Logic Layer (`ParametricLogic`).
* **Write Permissions:** Logic Layer internal dirty-checking.

### Contract
1.  **The Invalidation Gate:** A formula rebuild is permitted only if the shape key changes, `isManualOverride` is toggled, or direct HUD input is detected.
2.  **Parametric Persistence:** Changes to numeric constants (sliders) must update the scope object but must not trigger a string rebuild.
3.  **Immutability:** The Scope object must be deep-frozen (`Object.freeze`) before being passed to the HUD to prevent "Read-Only" mutation errors.

### Forbidden Behavior
* UI components must not trigger formula generation logic directly.
* Regex operations are strictly forbidden in the "Parametric Update" code path (e.g., slider movement).

---

## Spec 3: Coordinate Normalization & Scaling
**Context:** Implementation Notes 3

### Background
Ambiguity in mathematical ranges between different shapes led to "Variable Spatial Ranges" where models would frequently clip through the camera or appear microscopic. This specification decouples the pure mathematical logic from the physical units of the 3D scene.

### Summary
This specification codifies the Post-Calculation Scaling contract. It ensures that the mathematical "Unit Space" and the physical "Scene Space" are treated as distinct layers.

### Authority
* **Authoritative Source:** The Worker Kernel (during vertex assembly).
* **Non-authoritative Observers:** Three.js Scene.

### Contract
1.  **Unit Logic:** Formulas must target a normalized range (ideally $[-1.0, 1.0]$) before any scaling is applied.
2.  **Post-Calculation Scaling:** The `scaleFactor` must be applied as a final transformation step within the Worker, never embedded directly inside formula strings.
3.  **Axis Alignment:** The Worker is responsible for projecting abstract $u,v$ coordinates into $x,y,z$ Cartesian space.

### Forbidden Behavior
* Main-thread logic must not perform vertex-level scaling; this is an exclusive Worker-side operation to maintain the Flyweight contract.

---

## Spec 4: Buffer Ownership & Flyweight Lifecycle
**Context:** Implementation Notes 4

### Background
High-frequency geometry updates previously caused "Memory Thrashing" and severe Garbage Collection pauses. This specification was created to shift the system to a "Zero-Copy" persistent buffer strategy required for stable performance.

### Summary
This specification codifies the Memory Ownership & Transfer contract. It mandates the reuse of pre-allocated buffers and the use of Transferable Objects to eliminate memory allocation overhead.

### Authority
* **Authoritative Source:** The Web Worker (during calculation), The GPU (during render).
* **Write Permissions:** The Worker (only while holding buffer ownership).
* **Read Permissions:** The Main Thread (only after ownership transfer).

### Contract
1.  **Flyweight Reuse:** The system must pre-allocate `Float32Arrays` based on grid resolution and reuse them across RID cycles.
2.  **Transferable Contract:** Memory must be moved via Transferable Objects. Once a buffer is posted, the sending thread must lose all access to that memory (Detaching).
3.  **Back-Buffer Rotation:** The system must maintain a rotation of buffers to allow concurrent calculation and rendering.

### Forbidden Behavior
* Allocating a new `Float32Array` within the `calculateGeometry` loop is a breach of contract.
* The UI thread must not attempt to mutate a buffer while the Worker holds ownership.

---

## Spec 5: Layout Authority & Epistemic Decoupling
**Context:** Visual Stability & Anti-Flicker Protocols

### Background
Asynchronous events (`ResizeObserver`) frequently returned transient "trash values" while the CSS grid was reflowing. This led to a feedback loop where the UI movement caused a resize, which in turn triggered a layout shift, resulting in "Layout Thrashing" and "8 renders/sec" high-frequency flickering.

### Summary
This specification codifies the **Temporal Gate** for UI measurements. It ensures the 3D Scene and Logic Layer ignore the "noise" of browser reflows and only commit to stable, debounced layout states.

### Authority
* **Authoritative Source:** The Global Window Object (`window.innerWidth`).
* **Non-authoritative Observers:** `ResizeObserver`, Component-level logic.
* **Write Permissions:** Restricted to the debounced `handleResize` handler.

### Contract
1.  **The Hysteresis Fence:** Transitions between `mobile` and `desktop` must maintain a minimum **200px dead-zone** (e.g., 700px/950px) to prevent sidebar-induced oscillation.
2.  **Temporal Debouncing:** `LayoutMode` dispatches must be debounced by a minimum of **100ms** to ensure physical resize actions have concluded.
3.  **Transient Gate:** The Scene Manager must discard resize callbacks where dimensions jump by $>300px$ in a single tick, treating them as layout snaps rather than valid camera refits.
4.  **Persistence of Vision:** The `VariableBridge` must never return `null`. It must cache and return the **Last Valid Scope** to anchor geometry during the "Null-Gap" frames of React re-renders.

### Forbidden Behavior
* Logic Layer must never use `getBoundingClientRect()` from a grid-participating element to determine `LayoutMode`.
* The `CoverageWatchdog` must not trigger at a frequency higher than **150ms**.

---

## Change Control
Any modification to these five specs requires an update to the corresponding **Playwright Smoke Tests** to ensure the v0.5 initial release candidate maintains these invariants.

## Status
* **State:** Active (Release Candidate v0.5.1)
* **Last Updated:** January 2026