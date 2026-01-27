# Architecture Orchestration: The Tag-Based Model

**Status:** Active (v0.5.0)
**Context:** System Governance & Release Strategy

## 1. Philosophy: Architecture as a Temporal Contract
We reject the notion of architecture as a static diagram. In the Parametric Engine, architecture is a **temporal contract** enforced by Git Tags. 

* **The Invariant:** A tag (e.g., `v0.5.0`) is not just a version number; it is a cryptographic signature attesting that a specific set of architectural constraints (Logic, Security, Performance) held true at a specific moment in time.

## 2. The v0.5.0 Baseline (The Unified Engine)
The `v0.5.0` tag represents the transition from a "Fragile Experiment" to a "Hardened Engine."

* **Core Invariant:** **Main Thread Isolation.** The UI thread handles *Intent*; the Worker thread handles *Math*.
* **Enforcement Mechanism:** `ParametricIntentService` acts as the authoritative air-gap, preventing the UI from directly mutating the Geometry.

## 3. Orchestration Mechanics

### A. The Unidirectional Data Flow (The "One-Way" Street)
1. **User** interacts with UI (React).
2. **UI** dispatches Intent (Event Bus).
3. **Service** normalizes Intent and updates State (Reducer).
4. **Service** posts message to Worker (Zero-Copy Transfer).
5. **Worker** computes Geometry (JIT Compilation).
6. **Worker** returns Buffers (Transferable Objects).
7. **Scene** renders Frame (Three.js).

### B. The "Green Sweep" Protocol
Architecture is only valid if it is verifiable. We enforce this via the **Green Sweep**:
1. **Unit Tests:** Verify Logic Layer invariants (Jest).
2. **Smoke Tests:** Verify Integration and Rendering (Playwright).
3. **Coverage Gate:** Verify Telemetry (>80% Statement Coverage).
4. **Tag:** Only when all lights are Green is the Architecture ratified.

## 4. The Tooling Substrate (Why Node.js?)
While the Parametric Engine runs in the browser, we utilize the Node.js ecosystem as our **Orchestration Layer**.

* **Determinism:** `npm ci` ensures that the build environment is mathematically reproducible.
* **Observability:** Playwright (running on Node) provides deep introspection into the browser's execution context, allowing us to "see" inside the engine during CI.
* **Velocity:** Vite (Node-based) provides the Hot Module Replacement (HMR) necessary for rapid parametric tuning.
