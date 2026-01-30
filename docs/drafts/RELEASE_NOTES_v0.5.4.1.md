# Release Notes: v0.5.4.1 — Mobile UX Hardening & Social Serialization  (DRAFT)

**NOTE: AI generated**

**Overview:**
This maintenance release focuses on "Hardening the Act." Following the v0.5.4 Proof of Concept, v0.5.4.1 resolves critical mobile layout regressions, optimizes the instructional tooltip system for a less intrusive user experience, and establishes the groundwork for "Social Math" through URL-based state serialization.

---

## 1. Mobile UX & Layout Hardening

* **Window-Aware Positioning:** Resolved a layout regression where mobile interface containers were displayed partially off-screen on devices like iPhone. Containers now correctly align to the interface label baseline.
* **Instructional Tooltip Optimization:**
  * **Single-Shot Display:** Tooltips are now restricted to one appearance per session to prevent UI fatigue.
  * **Auto-Dismiss:** Implemented a 2-second timeout and forced dismissal upon closing interface containers.
  * **Context-Aware Suppression:** The "About" tooltip is now suppressed in mobile mode to prevent visual confusion after returning from external documentation.

---

## 2. Social Math & State Serialization (Groundwork)

* **URL Integration:** Added architectural requirements to `TODO.md` for injecting interface parameters (rotation, zoom, HUD formulas) into the URL. 
* **State Contracts:** This enables users to bookmark specific geometric states and share mathematical discoveries via a single URL string.

---

## 3. Updated Project Priorities

* **README Realignment:** Reordered post-v0.5 priorities to focus on Accessibility and Fidelity as the primary objectives for the 0.5.x cycle.
* **Fidelity Validation:** Formally recognized the v0.5.4 Meta-Testing PoC results within the project roadmap.
* **Accessibility Audit:** Logged the completion of Aria tagging (v0.5.1) while noting that formal acceptance testing is pending.

---

## 4. Stability & Feature Flags

* **Global Optimization:** All 0.5.X feature flags have been toggled **ON** by default (excluding internal test stubs).
* **Pointer Event Logic:** Refactored `useOutsideDismiss` to handle cross-browser pointer interactions more robustly, improving mobile touch-to-dismiss behavior.

---

## 5. Quality Audit (v0.5.4.1 Results)

| Category | Metric | Result | Notes |
| :--- | :--- | :--- | :--- |
| **Global Pass Rate** | Total Success | **✅ 100% (741/741)** | Jest + Playwright |
| **Full Stack** | Statement Coverage | **✅ 88.08%** | Unified Metric |
| **Visual Regression** | Snapshot Integrity | **✅ 100%** | Deterministic Engines |
| **PoC: Meta-Audit** | Tagged Ratio | **⚠️ 7.1%** | 21/297 tests tagged |
| **PoC: Intent Match** | Semantic Alignment | **🚨 12%** | Marker mismatch detected |

---

*v0.5.4.1 | 2026-01-30*