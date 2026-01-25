# RELEASE MANIFEST VERSION 0.5: The Unified Engine Baseline

**NOTE: AI generated, still under review.**

**Status: Hardened & Verified (Baseline Anchored)**

This release represents a fundamental "core transplant" of the Parametric 3D Engine. The system has transitioned from a legacy 2019 CRA structure to a high-performance, Vite-powered multi-threaded architecture governed by strict mathematical invariants.

## What Has Changed: The Core & HUD
- Vite Migration & Legacy Removal: Fully purged Create React App (CRA) dependencies. Purged legacy src/serviceWorker.js to eliminate bundle conflicts.
- Asynchronous Geometry Pipeline: Decoupled vertex math from the UI thread to ensure consistent 60fps responsiveness via Web Workers.
- JIT Formula Engine: Live evaluation of GLSL-style formulas with built-in mathematical safety wrappers and zero-copy memory transfers.
- Heads-Up Display (HUD): A new "control room" interface providing transparency into shape generation and real-time formula editing.

## CI Determinism & Stability (The "Solid" Baseline)
To ensure the integrity of the v0.5.0 release, we implemented a rigorous validation layer:
- Atomic Artifact Merging: Implemented a "Holding Area" pattern in the deployment pipeline. Test reports are now cached in a protected zone and merged into the production dist/ folder after the build process, preventing Vite from overwriting critical diagnostic data.
- Hardened Handshake: Replaced poll-based testing with a signal-driven architecture (window.__coverage__ verification). The suite now synchronizes directly with the Worker’s internal readiness state.
- Always-On Local Telemetry: Integrated cross-env VITE_COVERAGE=true into the development tier to ensure local tests never fail due to missing instrumentation.
- Unified Coverage Merging: Reached a verified 88.08% Statement Coverage by merging Jest unit data with multi-browser Playwright shards (Chromium, Firefox, Webkit).
- Automated Leak Guard: Integrated a programmatic sanitization gate to ensure local paths (/Users/...) and internal CI metadata are scrubbed from public reports.
- Subpath Normalization: Implemented client-side trailing slash redirection to ensure reliable asset resolution on GitHub Pages.
- Sequential Integration (Safety Fuse): Orchestrated the GitHub Actions workflow to separate the test and deploy stages. Deployment now utilizes an artifact handshake; if the testing job identifies a regression, the deployment job is automatically neutralized, ensuring the live environment only reflects verified, integrated code.

## Documentation and Governance
The v0.5 refactor is governed by a set of Foundational Invariants:
- Architecture Specs: ./docs/ARCHITECTURE.md
- Parametric Authority: ./docs/PARAMETRIC_AUTHORITY.md
- Implementation Notes: ./docs/IMPLEMENTATION_NOTES.md

## Transactional Integrity & Observability
- Observer Standard Validation: Precision Shadowing tests ensure that UI interactions (HUD dragging/resizing) remain mathematically silent and do not deform geometry.
- Numerical Drift Detection: Established a mathematical audit tool to detect precision variance between the Main Thread and Worker environments (Targeted for v0.5.1 optimization).

## A Note on AI Collaboration
This release was rearchitected with the intensive assistance of Large Language Models (LLMs). The development process utilized AI for high-velocity implementation and complex debugging—notably resolving the asynchronous signaling bottlenecks and Vite-Istanbul integration—while the Human Operator (Epistemic Anchor) worked to maintain architectural authority and final validation of all mathematical invariants.
