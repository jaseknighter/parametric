#  RELEASE NOTES VERSION 0.5: The Unified Engine Baseline  (2026-01-24) 

**NOTE: AI generated.**

NOTE: AI generated.

This release represents a fundamental "core transplant" of the Parametric 3D Engine. The system has transitioned to a high-performance, multi-threaded architecture governed by strict mathematical invariants, ensuring a rock-solid foundation for future generative features.

## What Has Changed: The Core & HUD
- Asynchronous Geometry Pipeline: Decoupled vertex math from the UI thread to ensure consistent 60fps responsiveness.
- JIT Formula Engine: Live evaluation of GLSL-style formulas with built-in mathematical safety wrappers.
- Zero-Copy Memory Transfers: Minimized latency by transferring ownership of vertex buffers rather than cloning data.
- Heads-Up Display (HUD): A new "control room" interface providing transparency into shape generation. By enabling direct code editing alongside traditional sliders, it allows the user to transition from a "shape explorer" to a "mathematical author."

## CI Determinism & Stability (The "Solid" Baseline)
To ensure the integrity of the v0.5.0 release, we implemented a rigorous cross-platform validation layer:
- Deterministic Worker Handshake: Replaced poll-based testing with a signal-driven architecture (window.__PARAMETRIC_READY__). The suite now synchronizes directly with the Worker’s internal readiness state.
- Targeted CI Optimization: Established a 90-second "Soak Time" for software-rendered environments. We explicitly optimized the CI path to focus visual regression on Chromium and WebKit, bypassing headless Linux limitations that historically stalled the pipeline.
- Unified Coverage Merging: Implemented a "Settle Guard" to ensure 100% of telemetry—from Jest unit tests to cross-browser Playwright shards—is captured and merged into a single source of truth (~81% line coverage).
- Automated Leak Guard: Integrated a programmatic sanitization gate to ensure local paths and internal CI metadata are scrubbed from public-facing reports.

## What Remains the Same: The Interface
- UI & UX Layout: Primary controls and interaction patterns remain unchanged to preserve user muscle memory.
- Data Schema: The underlying JSON schema is fully backwards compatible; existing "recipes" remain functional.
- Core Visual Identity: The aesthetic rendering style remains consistent with previous versions.

## Documentation and Governance (DRAFT)
The v0.5 refactor is governed by a set of Foundational Invariants—core rules that ensure system stability across threads.
- Architecture Specs: ./docs/ARCHITECTURE.md
- Parametric Authority: ./docs/PARAMETRIC_AUTHORITY.md
- Design Patterns: ./docs/DESIGN_PATTERNS.md
- Implementation Notes: ./docs/IMPLEMENTATION_NOTES.md

## Transactional Integrity & Observability
- Observer Standard Validation: Precision Shadowing tests ensure that UI interactions remain mathematically silent and do not deform geometry during monitoring.
- Central Channel Authority: All system telemetry is governed by a unified registry in ParametricConstants.js.
- The "All-or-Nothing" Rule: An implementation of the Invariant principle ensuring the engine updates every point in a mesh atomically.

## A Note on AI Collaboration
This release was rearchitected with the intensive assistance of Large Language Models (LLMs). The development process utilized AI for high-velocity implementation and complex debugging—notably resolving the asynchronous signaling bottlenecks—while the Human Operator (Epistemic Anchor) worked to maintain architectural authority, oversight, and final validation of all mathematical invariants.