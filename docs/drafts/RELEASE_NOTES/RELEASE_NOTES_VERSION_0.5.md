# RELEASE NOTES: v0.5.0 "The Unified Engine Baseline" 

**Date:** 2026-01-24  
**Status:** Hardened, Deployed, & Verified  
**Coverage:** 88.08% (Unified)

## 🚀 The Core Transplant
Version 0.5.0 marks the transition of the Parametric Geometry Explorer into a professional-grade 3D engine. By migrating to **Vite** and implementing a **multi-threaded worker architecture**, we have unlocked high-performance shape generation that remains responsive even during complex mathematical evaluations.

---

## ✨ Key Features & Architectural Shifts
- **Asynchronous Geometry**: Vertex math now lives in a dedicated Web Worker, preventing UI "jank."
- **JIT HUD Explorer**: Edit formulas directly in the browser. Transition from a "shape explorer" to a "mathematical author" with real-time feedback.
- **Unified Testing Fortress**: A merged testing pipeline (Jest + Playwright) ensuring the engine behaves identically across **Chrome, Firefox, and Safari (Webkit)**.
- **Performance-First Memory**: Implemented Zero-Copy transfers for vertex buffers to maximize throughput between threads.

---

## 🛡️ Stability & Security
- **Hardened CI**: 100% pass rate across 115 enterprise-grade tests.
- **Always-On Coverage**: Local development environments are now fully instrumented by default, ensuring "it works on my machine" translates to "it works in production."
- **Privacy Guard**: Programmatic scrubbing of internal file paths and metadata from all public-facing reports.
- **Subpath Resilience**: Improved URL handling for GitHub Pages deployment.
- **The "Safety Fuse" CI**: Implemented a strictly sequential CI pipeline. Deployment is gated behind a full test-suite clearance; if a mathematical invariant or logic test fails, the "fuse" blows and the live site is protected from receiving the broken update.

---

## 📖 New (DRAFT) Documentation 
- **Architecture**: `docs/ARCHITECTURE.md`
- **Authority Contract**: `docs/PARAMETRIC_AUTHORITY.md`
- **Implementation Rules**: `docs/IMPLEMENTATION_NOTES.md`

---

## 🤖 AI-Human Collaboration
This release was co-authored with Large Language Models (LLMs). AI provided high-velocity debugging and infrastructure implementation, while the Human Operator served as the **Epistemic Anchor**, and **worked to maintain** architectural authority, working to ensure every decision adhered to the project's foundational mathematical invariants.

**Next Milestone:** v0.5.1 - See TODO.md `docs/TODO.md`