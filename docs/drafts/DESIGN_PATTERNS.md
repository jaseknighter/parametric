# Design Patterns: Core vs. Supporting Invariants (DRAFT)

**NOTE: AI generated, still under review.**

This document categorizes the design patterns utilized within the Parametric 2026 Engine. By separating Core Architectural Patterns from Supporting Infrastructure Patterns, developers can distinguish between the fundamental "Command and Control" logic that maintains physical integrity and the auxiliary patterns used for optimization and compatibility.

**Part 1: Core Architectural Patterns (System Invariants)**
These patterns define the application's "Soul." They are non-negotiable for maintaining the physical integrity of the 3D pipeline.
1. Monotonic Fence & Sequence
* **Definition:** A synchronization barrier that ensures data is processed in a strictly increasing numerical order, causing any out-of-order or late-arriving stale data to be automatically discarded.
* **Implementation:** The global `RID_COUNTER`. By attaching a unique, incrementing ID to every intent, the Manager can physically discard any returning Worker calculation where `rid < highestRidProcessed`.
1. Authority Gate & Pre-emption (Guard Pattern)
* **Definition:** A resource management strategy where high-priority events (User Input) have the power to terminate or block low-priority background processes (Automation/Polling) to ensure exclusive control.
* **Implementation:** The `isManualRef` semaphore. When the HUD is active, this binary gate blocks the auto-generator from shipping packets. The `resetAuthority()` method performs a pipeline flush to ensure zero-latency handover between modes.
1. Reactive Pull (Backpressure Management)
* **Definition:** A flow control pattern where the producer (UI) only sends data when the consumer (Web Worker) explicitly signals that it has completed its previous task and is ready for more.
* **Implementation:** The `isWorkerBusy` flag. This transforms a high-frequency "Firehose" of slider events into a controlled stream, preventing frame-drop and UI thread starvation during heavy mathematical calculations.
1. Strategy Pattern
* **Definition:** A behavioral pattern that defines a family of interchangeable algorithms and selects the appropriate one at runtime based on the current state of the application.
* **Implementation:** The `getWorkerDataPacket` logic. Based on the `isManualOverride` state, the system switches strategies between "Formula Baking" (Auto-derivation) and "Buffer Forwarding" (Manual HUD code) without changing the shipping protocol.

**Part 2: Supporting Patterns (Infrastructure & UX)**
These patterns solve engineering problems like memory management, component compatibility, and observability.
5. Adapter Pattern
* **Definition:** A structural pattern that translates the interface of one class into a format compatible with another, allowing objects with incompatible data structures to collaborate.
* **Implementation:** `ParametricRegistry`. It adapts internal nested 64-bit float state into the flat key-value pairs required by third-party UI components (React Compound Slider), keeping the Reducer "dumb" and decoupled.
6. Flyweight Pattern
* **Definition:** A structural pattern designed to minimize memory usage and CPU overhead by sharing as much data as possible with similar objects rather than creating new ones.
* **Implementation:** Geometry Attribute Buffers. Instead of instantiating new objects, the system reuses `Float32Arrays`. The Worker only updates vertex positions (extrinsic state), keeping memory allocation stable and preventing Garbage Collection spikes.
7. Proxy Pattern
* **Definition:** A structural pattern that provides a substitute or placeholder for another object to control access, often used to create a safe, read-only window into a private state.
* **Implementation:** The `window.parametricState` object. It provides a read-only mirror of the internal Reducer state to the global scope, allowing Playwright and Debug utilities to inspect truth without the risk of mutation.
8. Mediator Pattern
* **Definition:** A behavioral pattern that restricts direct communication between objects and forces them to collaborate only via a central hub, reducing chaotic dependencies.
* **Implementation:** `IntentService`. It acts as the central hub between the React Reducer, the UI, and the Worker. Components never talk to each other directly; they broadcast intents to the Service, which coordinates the handover of RIDs.
9. Finality Pattern (The Latch)
* **Definition:** A protocol ensuring that the final state of a high-frequency transient process is explicitly acknowledged and committed to ensure data integrity.
* **Implementation:** `onChange`/`onUpdate` dual-protocol. Sliders use `onUpdate` for "Lossy" high-speed movement and `onChange` for the "Lossless" final latch, ensuring the Worker and Reducer always converge on the exact final coordinate.

**Summary for Developers**
* Geometry Glitches? Check Part 1: Monotonic Fence or Authority Gate.
* Lag or Stuttering? Check Part 2: Flyweight or Backpressure.
* State Unreachable? Check Part 2: Adapter or Mediator.