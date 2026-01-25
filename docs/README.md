# Documentation Manifest (DRAFT v0.1)

This directory is organized into a **Quad-Pillar Model**: `architecture`, `development`, `operations`, and `testing`. 

The project rejects the notion that documentation is a secondary artifact. Instead, these pillars represent policy: the **Enforcement and Execution Framework** of the Parametric Engine.

## 🏛️ The Four Pillars

### 1. `/architecture` (Intent)
The blueprint and technical invariants.
* **Intent:** To define the system's structural constraints (e.g., JIT math logic, Worker-thread isolation) before code is written.

### 2. `/development` (Implementation)
The tactical execution of features.
* **Intent:** To document the implementation of specific UI components, parametric presets, and internal utilities.

### 3. `/operations` (Delivery)
Infrastructure as Code (IaC).
* **Intent:** To document the deployment lifecycle and the Blue/Green staging strategies that ensure reliable delivery.

### 4. `/testing` (Enforcement)
The binding authority between intent and reality.
* **Intent:** * `/testing/dev`: Proves that implementation matches architectural intent (Accuracy & Regression).
    * `/testing/operations`: Proves that infrastructure matches operational intent (Deployment & Security audits).

---
**The Invariant:** Architecture defines the rules, Dev and Ops play by the rules, and Testing is the referee that ensures the game is fair.

## 📚 Documentation Index

### `/docs`
* README.md - This manifest.
* TODO.md - Project scratchpad and strategic backlog.

### `/docs/architecture`
* ARCHITECTURE_ORCHESTRATION.md - Tag-based architecture orchestration strategy.

### `/docs/drafts`
* ARCHITECTURE.md - High-level system architecture.
* DESIGN_PATTERNS.md - Core and supporting design patterns.
* FORMULA_AUTHORITY_STATE_MACHINE.md - State machine logic for formula authority.
* GLOSSARY.md - Project terminology.
* IMPLEMENTATION_NOTES.md - Detailed implementation notes and pattern mapping.
* OBSERVABILITY.md - Observability strategy and implementation.
* PARAMETRIC_AUTHORITY.md - Authority model for parametric state.

### `/docs/operations`
* BLUE_GREEN_DEPLOYMENT.md - Infrastructure as Code and deployment strategy.