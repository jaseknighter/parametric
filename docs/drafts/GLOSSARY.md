# Glossary (DRAFT)

**NOTE: AI generated, still under review.**

**I. Foundational Invariants**
Foundational Invariants are properties the system must never violate, regardless of UI state, input timing, or execution order.
* **Authority Collision**
    * **Definition:** A conflict arising when two or more independent sources attempt to exercise control over the same resource or data point simultaneously.
    * **Implementation:** A state where the Auto-Loop and HUD both try to define the mesh's "recipe" at the same time, leading to Formula Collapse.
* **Deterministic Contract**
    * **Definition:** A system that, given a specific initial state and input, will always produce the exact same output without randomness.
    * **Implementation:** The Worker Contract, ensuring that specific inputs (Formula + Parameters + RID) always result in the exact same vertex positions.
* **Invariant**
    * **Definition:** A core architectural goal intended to remain unchanged regardless of operations applied to the system.
    * **Implementation:** The "Observer Standard." The engine is designed to behave identically whether diagnostics are active or not. Monitoring logic is restricted from altering the mathematical output or the timing of the primary execution loop.
* **Layout Authority**
    * **Definition:** The architectural principle that a single system (JavaScript state) dictates the visual arrangement of the application, rather than allowing competing systems (CSS Media Queries) to make independent decisions.
    * **Implementation:** Replacing implicit `@media` queries in `Parametric.css` with explicit classes like `.layout-desktop` and `.layout-mobile`, which are applied to the root container only when the JS-driven `layoutMode` state changes.
* * **Projection & Inversion**
    * **Definition:** Projection is the mapping of data from a raw space into a user-oriented space. Inversion is the mathematical reversal of that mapping.
    * **Implementation:** Transforms raw state (radians) to UI formats (degrees). Essential for handling the pixel-to-unit drift on texture sliders.
* **RID (Revision Identifier)**
    * **Definition:** A unique, monotonic token assigned to a specific version of state to track its evolution and ensure chronological order.
    * **Implementation:** The "Master Heartbeat" used for atomic transactions, allowing the Worker to reject out-of-order or stale updates.

**II. Governance Protocols**
The human-in-the-loop strategies and validation frameworks used to maintain architectural integrity when collaborating with LLMs.
* **Central Channel Authority**
    * **Definition:** A single source of truth for all observability categories to prevent "Log Chaos" and "Channel Drift."
    * **Implementation:** The `DEBUG_CHANNELS` registry in `ParametricConstants.js`, ensuring all system signals are governed and filterable.
* **Epistemic Anchor**
    * **Definition:** The human operator's role as the final arbiter of architectural intent in an AI-assisted development workflow.
    * **Implementation:** The "Accountable" (A) in the RACI model who validates LLM-suggested code against project invariants.
* **Socratic Workshop (Dialogue)**
    * **Definition:** An iterative, multi-turn engagement with an LLM focused on stress-testing assumptions rather than single-prompt transactions.
    * **Implementation:** The "Let's Get Dialogical" protocol used to refine the search grid from broad hypotheses to technical root causes.
* **Triangulation**
    * **Definition:** The act of cross-referencing a problem or solution across multiple LLM environments (e.g., Local IDE vs. Global Browser) to find the most robust architectural path.
    * **Implementation:** Comparing the **Precision** of IDE models with the **Accuracy** of Browser models.
* **Truthiness**
    * **Definition:** The statistical illusion of correctness in non-deterministic systems (LLMs); code that appears technically precise but lacks structural or strategic accuracy.
    * **Implementation:** The target of "Triangulation" sessions where browser-based logic is used to verify IDE-based code generation.

**III. Supporting Mechanisms**
The engineering patterns and implementation details used to enforce the Foundational Invariants.
* **Atomic Pivot / Transaction**
    * **Definition:** An operation treated as a single, indivisible unit where control is transferred or data is updated instantaneously.
    * **Implementation:** Collapsing a "Swarm" of parameter changes into one Reducer dispatch, preventing fragmentation and UI jitter.
* **Backpressure (via Busy Gates)**
    * **Definition:** Resistance applied when a data producer outpaces a consumer to prevent lag or memory exhaustion.
    * **Implementation:** The isWorkerBusyRef check in the tick loop, which defers new requests until the Web Worker has finished the current frame.
* **Double-Lock Authority**
    * **Definition:** A stability pattern where a transition must be verified at both the source (Producer) and the destination (Consumer).
    * **Implementation:** Implementing guards in both Parametric.js (to stop sending auto-packets) and worker.js (to stop accepting them).
* **Epsilon**
    * **Definition:** A small quantity representing a margin of error or a threshold for comparison between two values.
    * **Implementation:** Used in tests (e.g., toBeCloseTo) to allow for inevitable pixel-rounding drift ($1.91$ vs $2.0$) on UI interactions.
* **Hysteresis Failure**
    * **Definition:** A state of rapid oscillation (flickering) caused by overlapping or identical thresholds for state transitions.
    * **Implementation:** The `layoutMode` state in `Parametric.js`, which uses asymmetrical boundaries (700px for mobile entry, 750px for desktop re-entry) to provide a 50px "buffer zone" that prevents layout thrashing.
* **Hydration**
    * **Definition:** The process of filling a component with data to move it from a "dry" state to a fully functional one ready for interaction.
    * **Implementation:** The synchronous population of the HUD or Worker scope. In 0.5, this includes "Coverage Hydration" to wet the browser context for reporting.
* **Instrumentation Anchor**
    * **Definition:** A development-only runtime hook used to force the execution of "headless" code within a browser context.
    * **Implementation:** The useEffect block in Parametric.js that triggers utilities like VariableBridge to satisfy Monocart coverage requirements.
* **MID (Message Identifier)**
    * **Definition:** A unique tag attached to communications in a multi-threaded system to facilitate tracking and acknowledgment.
    * **Implementation:** A handshake ID used to implement a "fail-fast" policy, dropping stale results that arrive after a newer RID has rendered.
* **Synchronous Latch**
    * **Definition:** A mechanism that provides immediate state confirmation, bypassing asynchronous queues to ensure an atomic transition.
    * **Implementation:** Using a useRef to immediately flip the Manual bit, ensuring mode switches are perceived as instantaneous by the engine.
* **World Anchor**
    * **Definition:** A fixed point in 3D coordinate space `(0,0,0)` to which all camera transformations and viewport-fitting calculations are tethered.
    * **Implementation:** The `worldAnchor` Vector3 used in `handleResize` to prevent "Mobile Drift" when the UI layout shifts.
* **Zero-Copy Transfer**
    * **Definition:** A performance optimization where ownership of memory is transferred between threads rather than duplicated.
    * **Implementation:** Utilizing `ArrayBuffer` transfers between the Worker and the Main Thread to maintain a 60fps UI while shipping heavy geometry data.