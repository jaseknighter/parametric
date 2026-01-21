# Parametric System — Authority & Synchronization Contract (DRAFT)

**NOTE: AI generated, still under review.**

**Status:** Normative (v0.5 RC)  
**Applies to:** UI Controls, Reducer, Logic Layer, Web Worker  
**Enforced by:** Playwright Smoke Suite (v0.5) / Architectural Invariant Suite (v0.6+)

## 0. Background & Motivation
This document codifies the authority boundaries required to keep the parametric engine deterministic. In earlier versions, unclear ownership between the UI and Logic layers led to circular feedback loops, where the system would interpret its own state-sync broadcasts as new user input, causing "slider snap-back" and infinite render storms.

## 1. Single Source of Truth (SSOT)
* **Rule 1.1 — Reducer Authority:** The Reducer is the sole authoritative owner of parametric state. No other system may mutate parametric truth.
* **Rule 1.2 — Synchronous Publication:** The Reducer must synchronously publish its state to `window.parametricState` at commit time to provide a frame-accurate baseline for external observers.

## 2. Atomic Intent & RID Monotonicity
* **Rule 2.1 — Intent Atomicity:** A single user interaction must produce exactly one Reducer transaction and exactly one RID. Partial dispatches are forbidden.
* **Rule 2.2 — Monotonic Fence:** The system must enforce a strictly increasing Request ID (RID). Any calculation returning from the Worker with an ID less than or equal to the current "High Water Mark" must be discarded.

## 3. Logic Layer & Worker Contract
* **Rule 3.1 — Mirroring vs. Authority:** The Logic Layer is a state mirror, not an authority. It derives math formulas based on the Reducer's state but cannot override the Reducer.
* **Rule 3.2 — The Sync Lock:** During state synchronization, the Logic Layer must not broadcast updates back to the UI. This "Lock" prevents the historical circular feedback loop.
* **Rule 3.3 — Stateless Execution:** Web Workers must remain stateless. They receive a packet, execute math, and return a result. They must never infer intent or maintain internal state across RIDs.

## 4. Memory Ownership (Flyweight)
* **Rule 4.1 — Explicit Transfer:** Ownership of vertex buffers must be explicitly transferred between the Worker and the Main Thread via Transferable Objects. Concurrent mutation is a breach of contract.

---

# Project Documentation Index (v0.5 RC)

### Level 1: Core Architecture (The "Laws")
Fundamental contracts that define system stability and ownership.
* **Authority & Synchronization Contract:** The primary rules governing state and feedback loops.

### Level 2: Sub-System Specifications (The "Statutes")
Binary rules for specific technical pillars.
* **Spec 1:** RID Pipeline & Monotonicity
* **Spec 2:** Formula Invalidation
* **Spec 3:** Coordinate Normalization
* **Spec 4:** Buffer Ownership

### Level 3: Implementation Notes (The "Guides")
Tactical instructions and markers for developers working in the codebase.
* **Note 1-4:** RID, Invalidation, Scaling, and Buffer Management.
* **Note 5:** Testing & Validation: Current v0.5 Smoke Test procedures and the v0.6 Test Refactoring Roadmap.
* **Note 6:** System Initial State: The Cascade Hydration sequence (RID 0 → 1).
* **Note 7:** System Extension & Tactics: How to add sliders and inject math variables.

---

## Testing & Validation Roadmap

| Version | Testing Strategy | Target Outcome |
| :--- | :--- | :--- |
| **v0.5 RC** | Monolithic Smoke Suite | Ensure no regressions in current features; verify basic RID/Scale behavior. |
| **v0.6 RC** | Architectural Invariant Suite | Refactor Phase: Reorganize tests into `tests/pipeline/`, `tests/logic/`, etc., to match Specs 1-4. |

### Change Policy
For the duration of the v0.5 release, any architectural violation detected by the existing Smoke Tests must be addressed according to the rules in this Contract. The formal reorganization of the test files is deferred to the v0.6 development cycle to maintain stability during the current commit window.
