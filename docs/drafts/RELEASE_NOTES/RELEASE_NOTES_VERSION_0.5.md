#  RELEASE NOTES VERSION 0.5: The Unified Engine Baseline (2026-01-20) (DRAFT)

**NOTE: AI generated.**

This release represents a fundamental "core transplant" of the Parametric 3D Engine. While the system has transitioned to a high-performance, multi-threaded architecture governed by strict mathematical invariants, the external interface and data structures remain stable.

## What Has Changed: The Core & HUD
* **Asynchronous Geometry Pipeline:** Decoupled vertex math from the UI thread to ensure consistent 60fps responsiveness.
* **JIT Formula Engine:** Live evaluation of GLSL-style formulas with built-in mathematical safety wrappers.
* **Zero-Copy Memory Transfers:** Minimized latency by transferring ownership of vertex buffers rather than cloning data.
* **Heads-Up Display (HUD):** A new "control room" interface providing transparency into shape generation. By enabling direct code editing alongside traditional sliders, it allows the user to transition from a "shape explorer" to a more deeply engaged "mathematical author."

## What Remains the Same: The Interface
To maintain continuity, the primary application pillars have been preserved:
* **UI & UX Layout:** Aside from the addition of the HUD, the primary layout, controls, and interaction patterns remain unchanged.
* **Data Schema:** The underlying JSON schema driving the UI and parameter states is fully backwards compatible; existing "recipes" will continue to function.
* **Core Visual Identity:** The aesthetic and rendering style of the parametric shapes remain consistent with previous versions.

## Documentation and Governance
The 2026 v0.5 refactor is governed by a set of **Foundational Invariants**—core rules that ensure system stability across threads. For a deep dive into the logic behind these changes, please refer to the following repository documents:

* [Release Manifest v0.5 (DRAFT)](./docs/drafts/MANIFESTS/MANIFEST_VERSION_0.5.md)
* [Architecture Specs (DRAFT)](./docs/drafts/ARCHITECTURE.md)
* [Parametric Authority (DRAFT)](./docs/drafts/PARAMETRIC_AUTHORITY.md)
* [Design Patterns (DRAFT)](./docs/drafts/DESIGN_PATTERNS.md)
* [Implementation Notes (DRAFT)](./docs/drafts/IMPLEMENTATION_NOTES.md)
* [Glossary (DRAFT)](./docs/drafts/GLOSSARY.md)



## Transactional Integrity, Observability, and Testing
* **Observer Standard Validation:** Precision Shadowing tests ensure that UI interactions (focusing, dragging, clicking) remain mathematically silent and do not deform the geometry during diagnostic monitoring.
* **Central Channel Authority:** All system telemetry is governed by a unified registry in `ParametricConstants.js`, providing real-time visibility into Worker sync and Viewport layout integrity.
* **The "All-or-Nothing" Rule:** An implementation of the Invariant principle ensuring the engine must update every point in a mesh at the same time, preventing "glitchy" intermediate states during parameter shifts.

## A Note on AI Collaboration
This release was rearchitected with the intensive assistance of Large Language Models (LLMs). The goal was to ensure that while the AI provided the development velocity, the Human Operator (Epistemic Anchor) maintained architectural authority and oversight.