# Implementation Notes (DRAFT)

**NOTE: AI generated, still under review.**

## Table of Contents
- [0. Design Patterns](#0-design-patterns)
- [1. The RID Pipeline (Lifecycle & Monotonicity)](#1-the-rid-pipeline-lifecycle--monotonicity)
- [2. Formula Invalidation Protocol](#2-formula-invalidation-protocol)
- [3. Coordinate Normalization & Scaling](#3-coordinate-normalization--scaling)
- [4. Buffer Management & Flyweight Attributes](#4-buffer-management--flyweight-attributes)
- [5. System Extension & Tactics](#5-system-extension--tactics)
- [6. Parametric System Initial State Setup](#6-parametric-system-initial-state-setup)

## 0. Design Patterns

### Pattern to Source Tree Mapping
The following table maps the core and supporting design patterns to their primary file locations within the source tree. This serves as a lookup guide for maintaining the architectural invariants of the Parametric 2026 Engine.

| Pattern Category | Design Pattern | Primary File Location(s) | Implementation Marker |
| :--- | :--- | :--- | :--- |
| **CORE** | Monotonic Fence | `src/containers/Parametric/ParametricManager.js` | `highestRidProcessed` guard |
| **CORE** | Authority Gate | `src/containers/Parametric/Parametric.js` | `isManualRef` semaphore |
| **CORE** | Reactive Pull | `src/containers/Parametric/Parametric.js` | `isWorkerBusyRef` gate |
| **CORE** | Strategy Pattern | `src/containers/Parametric/ParametricLogic.js` | `getWorkerDataPacket` branch logic |
| **SUPPORT** | Adapter Pattern | `src/services/ParametricRegistry.js` | `ParametricRegistry` object mapping |
| **SUPPORT** | Flyweight Pattern | `src/containers/Parametric/Parametric.worker.js` | `Float32Array` buffer reuse |
| **SUPPORT** | Proxy Pattern | `src/containers/Parametric/Parametric.js` | `window.parametricState` assignment |
| **SUPPORT** | Mediator Pattern | `src/services/ParametricIntentService.js` | `IntentService` class |
| **SUPPORT** | Finality Pattern | `src/components/UI/MySlider/MySlider.js` | `onUpdate` vs `onChange` handlers |

### Implementation Context

#### 🏗️ Core Patterns: The Pipeline Integrity
The **CORE** patterns are concentrated in the `Parametric.js` container and the `ParametricManager.js`. This is the "control room" of the application.
* If you change the **Monotonic Fence** logic, you risk "Ghost Frames" where old data overwrites new user input.
* If you break the **Authority Gate**, the HUD and Sliders will begin fighting for control of the 3D scene.

#### 🛠️ Supporting Patterns: The Infrastructure
The **SUPPORT** patterns are distributed across services and components. They handle the "translation" and "efficiency" of the system.
* The **Mediator** (`IntentService`) ensures that React doesn't have to understand how the Web Worker communicates.
* The **Flyweight** (Worker) ensures that as the user moves a slider, the browser doesn't freeze due to massive memory allocation (Garbage Collection spikes).

### 🏁 Development Rule of Thumb
When adding a new feature or debugging an issue, identify which pattern is involved using the table above.
* Is the logic failing? Start at `ParametricLogic.js` (**Strategy**).
* Is the synchronization failing? Start at `ParametricManager.js` (**Monotonic Fence**).
* Is a UI element not reflecting the state? Start at `ParametricRegistry.js` (**Adapter**).

---

## 1. The RID Pipeline (Lifecycle & Monotonicity)

### The Problem: Ghost Frames
During the development of the initial release candidate (v0.5), the 3D engine utilized system timestamps to order mathematical calculations returning from the Web Worker. Under high-frequency interactions, this resulted in "Ghost Frames." Because Worker processing duration varies based on formula complexity, a calculation for an older state would occasionally finish after a newer one, causing the 3D geometry to flicker or "rubber-band" as the renderer jumped between out-of-order results.

### The Fix: Monotonic RID
System timestamps were replaced with a strictly increasing **Monotonic Request ID (RID)** counter. The system now enforces a **Monotonic Fence**: any data packet returning from the Worker is physically discarded if its RID is not strictly greater than the last processed RID.

### The RID Lifecycle: From Intent to Render
The RID follows a circular path through the application layers to ensure every calculation is explicitly tied to the state snapshot that requested it.

1.  **Generation (UI Layer):** Upon interaction, `ridCounterRef.current` is incremented. This integer is passed to the dispatch function and the local `parametricObjRef.current`.
2.  **Shipment (Logic Layer):** The `shipIntent` function captures the current state and the new RID. `ParametricLogic.js` wraps these into a `workerDataPacket`. The RID serves as the "Contract ID" for the calculation.
3.  **Execution (Worker Layer):** The Web Worker receives the packet, performs the calculations, and attaches the original RID to the result buffer. The Worker "echoes" the RID to maintain the chain of custody.
4.  **Verification (Manager Layer):** The `ParametricManager` receives the buffer and compares the packet’s RID against the `highestRidProcessed`.
    *   If `packet.rid > highestRidProcessed`, the geometry is updated.
    *   If `packet.rid <= highestRidProcessed`, the packet is discarded as stale.
5.  **Finality (Render Layer):** Upon successful update, `highestRidProcessed` is updated to the current RID, moving the "Monotonic Fence" forward. Additionally, per **Spec 5**, the `VariableBridge` must cache the result of the RID pipeline to prevent "transient flashes" during layout shifts.

### Worker Backpressure: The Reactive Pull Pattern
To prevent the UI thread from flooding the Web Worker during rapid interactions, the system implements a Reactive Pull mechanism.
*   **Mechanism:** Before calling `postMessage`, the system checks `isWorkerBusyRef.current`.
*   **Blocking:** If the Worker is busy, the system sets `needsUpdateRef` to `true` but does not ship a new packet.
*   **Resolution:** When the Worker returns a result, `isWorkerBusyRef` is set to `false`. If `needsUpdateRef` is active, the system immediately ships the latest available state.

### Implementation Markers

#### 1. Incrementing & Shipping (`Parametric.js`)
```javascript
const rid = ++ridCounterRef.current;
dispatch({ type: 'INTENT_UPDATE', batch: updateArray, rid });

// Backpressure Gate
if (isWorkerBusyRef.current) {
  needsUpdateRef.current = true;
  return;
}
isWorkerBusyRef.current = true;
worker.postMessage(packet);
```

#### 2. The Monotonic Guard (`ParametricManager.js`)
```javascript
// Discard any packet that arrived out of order or is a duplicate
if (statusInfo.rid <= this.highestRidProcessed) {
    Debug.log("PIPELINE", `Discarding stale RID: ${statusInfo.rid}`);
    return;
}
this.highestRidProcessed = statusInfo.rid;
```

### Troubleshooting & Impact
*   **Immunity to Clock Jitter:** Integer counters are collision-proof, unlike millisecond timestamps.
*   **Protocol-Based Testing:** Playwright tests utilize `waitForRID` rather than arbitrary "sleep" timers, ensuring a stable path to meeting all v0.5 requirements.
*   **State Entry Points:** Every mechanism modifying state must increment the `ridCounterRef`. Failing to do so causes the Manager to discard the result as a stale duplicate.
*   **Execution Scope Mismatch:** If geometry appears "zeroed" despite a correct RID, ensure `parametricObjRef.current` was updated synchronously before `shipIntent` was called.

⚠️ **BACKPRESSURE WARNING:** If `isWorkerBusyRef` is true, the system MUST NOT increment the RID for the skipped frame. The RID represents a "Unit of Work" shipped, not just an intent expressed.

**Snapshot Isolation (Spec 1):** The Manager must capture a static clone of the `parametricState` at the moment of RID generation. The Worker must never operate on a live reference that could mutate during the asynchronous round-trip.

---

## 2. Formula Invalidation Protocol

### The Problem
Generating a mathematical formula string (e.g., converting PINCH into a string of sin and cos functions) involves heavy regex operations and string concatenation. Performing this on every slider movement (60 times per second) creates significant CPU overhead on the main thread and unnecessary garbage collection.

### The Fix
The system separates **Formula Generation (Structural)** from **Scope Update (Parametric)**. A formula is only "invalidated" and rebuilt when the underlying topology changes.

### Invalidation Triggers
A full string rebuild is triggered only by the following events:
*   **Shape Change:** Switching from SINE to MOBIUS or KLEIN.
*   **Mode Toggle:** Switching between Auto and Manual override.
*   **Manual Input:** Direct character entry into the Formula HUD.

### The Persistence Strategy
For all other interactions—such as moving sliders for BEND, PINCH, or SPIRAL—the existing formula strings are considered "Valid" and are cached.
1.  **Scope Injection:** The new numeric values are injected into the `workerDataPacket.scope` object. **Invariant (Spec 2):** The Scope object must be deep-frozen before injection. Bypassing this protocol causes "Read-Only" mutation errors (e.g., `Attempted to mutate property "a"`).
2.  **Zero-Regex Pipeline:** The Worker receives the same formula string it used previously but executes it against the updated scope variables.
3.  **Result:** Instantaneous geometric updates with near-zero overhead on the UI thread.

### Implementation Markers

#### 1. Invalidation Logic (`ParametricLogic.js`)
The logic layer checks for structural changes before deciding to run the generator.
```javascript
// Example of the Invalidation Gate
const shouldRebuild = (settings.shape !== lastShape) || (settings.isManual !== lastManual);

const uFormula = shouldRebuild 
  ? Formulas.generateFormulaString(settings, scope, 'u') 
  : lastCachedUFormula;
```

#### 2. Scope Injection (`Parametric.worker.js`)
The Worker remains agnostic to whether the formula is new or cached.
```javascript
// The Worker simply executes whatever string it is given
// against the new scope provided in the packet.
// const x = evaluate(uFormula, scope); 
```

### Troubleshooting Invalidation Issues
*   **Symptom:** Sliders move, but the geometry does not change.
    *   **Diagnosis:** The formula is likely stale because a structural change occurred but the Invalidation Trigger failed to fire.
    *   **Fix:** Ensure the `shape` or `isManual` keys in the Reducer are correctly updated to trigger the `shouldRebuild` logic.
*   **Symptom:** UI "stutters" or lags specifically during slider movement.
    *   **Diagnosis:** The system is likely rebuilding the formula strings on every frame instead of reusing the cache.
    *   **Fix:** Check `ParametricLogic.js` to ensure that standard parametric updates are not accidentally tripping the invalidation gate.

---

## 3. Coordinate Normalization & Scaling

### The Problem: Variable Spatial Ranges
Mathematical formulas generated in the Logic layer operate in an abstract "Unit Space" (typically ranging from $-1.0$ to $1.0$). However, the physical Three.js scene requires coordinates that align with the visual grid and the camera's view frustum. Without a normalization strategy, shapes might appear microscopic or excessively large depending on the specific formula complexity. To ensure a consistent user experience, the system must bridge the gap between raw mathematical output and scene-relative scale.

If the Web Worker returns raw mathematical values directly to the GPU, the resulting mesh size becomes unpredictable. A simple SINE wave might have an amplitude of $1.0$, but a complex KLEIN or MOBIUS calculation might produce values that are either too small to be seen or large enough to exceed the camera's clipping planes. Hard-coding scales into the mathematical strings themselves is brittle and prevents global scene adjustments.

### The Fix: Global Scale Injection
System-wide scaling is decoupled from the mathematical logic. The Worker performs a final **Coordinate Normalization** pass using a `scaleFactor` provided by the Intent Layer. This ensures the "Unit Logic" of the math remains pure while the renderer dictates the "Physical Presence" of the object.

### The Scaling Process
The transformation is handled in three distinct phases within the pipeline:
1.  **Unit Calculation:** The formula is evaluated in its native mathematical range (e.g., $u,v \in [0, 1]$).
2.  **Scene Scaling:** A `scaleFactor` constant (derived from `shapingDefaults.json`) is applied to the $x, y, z$ results. **Temporal Gate (Spec 5):** Scaling logic must wait for the 100ms debounce defined in the Layout Authority spec to avoid jitter caused by "trash widths" (e.g., 200px during a mobile snap).
3.  **Axis Projection:** The Worker maps these scaled values into the vertex buffer based on the active projection (e.g., mapping $x$ to the depth axis if the view is rotated).

### Implementation Markers

#### 1. Scale Attachment (`ParametricLogic.js`)
The logic layer retrieves the scalar from the configuration and injects it into the worker's execution scope.
```javascript
// Mapping the global config scalar to the worker scope
const packet = {
  scope: {
    ...currentParams,
    scaleFactor: settings.globalScale || 1.0
  }
};
```

#### 2. Final Vertex Assembly (`Parametric.worker.js`)
The Worker applies the scalar as the final step before posting the result buffer back to the main thread.
```javascript
// Within the calculation loop:
// Apply the scalar to the raw mathematical result
const finalX = rawX * scope.scaleFactor;
const finalY = rawY * scope.scaleFactor;
const finalZ = rawZ * scope.scaleFactor;

// Populate the Float32Array
positions[i]     = finalX;
positions[i + 1] = finalY;
positions[i + 2] = finalZ;
```

### Troubleshooting & Impact
*   **Invisible Geometry:** If the 3D model is missing, verify the `scaleFactor` is not $0$. A zeroed scalar will collapse all vertices to the origin.
*   **Clipping Issues:** If parts of the model disappear when rotating, the `scaleFactor` may be too high for the current camera frustum.
*   **Shape Inconsistency:** If the size jumps drastically when switching shapes, the formula in `ParametricGeometryFormulas.js` is likely not producing a normalized range. Formulas should ideally target a $1.0$ unit cube before scaling.
*   **Scale Determinism:** Because scaling happens in the Worker based on the `workerDataPacket`, it is tied to the RID. This ensures that a "Scale Jump" cannot happen out of sync with a "Shape Change."

---

## 4. Buffer Management & Flyweight Attributes

### Background (The Why)
In a high-frequency parametric system, generating new 3D geometry 60 times per second involves calculating thousands of vertex positions. In a standard approach, creating new arrays for these vertices on every frame triggers frequent Garbage Collection (GC). These "GC pauses" cause the UI thread to stutter, resulting in dropped frames during slider manipulation. To maintain a smooth 60fps experience, the system must treat memory as a reusable resource rather than a disposable one.

### The Problem: Memory Thrashing
Creating a new `Float32Array` for every RID increment leads to "Memory Thrashing." The browser must constantly allocate space for new vertex data and clean up the old arrays. In the initial release candidate (v0.5), this resulted in a "sawtooth" memory profile where performance would degrade every few seconds as the browser paused execution to reclaim memory.

### The Fix: Flyweight Attribute Buffers
The system implements a **Flyweight Pattern** combined with **Buffer Recycling**. Instead of allocating new memory, the Web Worker maintains a persistent set of attribute buffers.
*   **Static Structure:** The size of the vertex array is pre-calculated based on the grid resolution.
*   **Extrinsic Updates:** Only the values inside the array (the extrinsic state) are updated by the math engine.
*   **Transferable Objects:** The system uses `self.postMessage(..., [buffer])` to transfer ownership of the memory between the Worker and the Main Thread, eliminating the need to copy data.

### The Buffer Lifecycle
The vertex data follows a "Zero-Copy" loop between threads:
1.  **Allocation:** Upon initialization, a `Float32Array` is created with a size of `rows * columns * 3`. **Warning:** Any attempt to allocate a new `Float32Array` inside the main loop is flagged as **Forbidden Behavior**.
2.  **Calculation:** The Worker populates this specific buffer with the results of the parametric formulas.
3.  **Transfer:** The buffer is "shipped" to the `ParametricManager` via ownership transfer. The Worker loses access to this memory temporarily to prevent race conditions.
4.  **Application:** Three.js receives the buffer and updates the `geometry.attributes.position` by setting the `needsUpdate` flag to `true`.
5.  **Recycling:** Once the frame is rendered, the buffer is sent back to the Worker (or a second "back-buffer" is used) to be filled with the next RID's data.

### Implementation Markers

#### 1. Buffer Transfer (`Parametric.worker.js`)
The Worker sends the data as a "Transferable," which is the most performant way to move large datasets in JavaScript.
```javascript
// Post the result and transfer the underlying ArrayBuffer
self.postMessage({
  type: 'RESULT',
  rid: data.rid,
  positions: positionsBuffer // The Float32Array
}, [positionsBuffer.buffer]); // Ownership transfer
```

#### 2. Attribute Injection (`ParametricManager.js`)
The Manager receives the buffer and injects it into the existing Three.js geometry.
```javascript
// Update the existing attribute rather than creating a new one
const attr = this.mesh.geometry.attributes.position;
attr.array = incomingPositions; // Point to the transferred buffer
attr.needsUpdate = true;        // Signal the GPU to re-upload
```

### Troubleshooting & Impact
*   **Stuttering During Interaction:** If the UI "hitches," check the Memory tab in DevTools. If you see a sawtooth pattern of allocations, it indicates the Flyweight pattern is failing and new arrays are being created instead of reused.
*   **"ArrayBuffer is Detached" Error:** This occurs if the Worker tries to access a buffer that has already been transferred to the Main Thread. Ensure the Worker creates or receives a fresh "Back-Buffer" before the next RID calculation begins.
*   **Geometry Disappearance:** If the mesh vanishes after the first frame, verify that `attr.needsUpdate = true` is being called. Three.js will not check for buffer changes unless this flag is explicitly set.
*   **Resolution Bottleneck:** High-resolution grids (e.g., 500x500) increase the buffer size significantly. The Flyweight pattern is critical here; without it, the memory overhead of high-res geometry would crash the browser tab.

---

## 5. System Extension & Tactics

### 1. Parameter Registration (Adding New Controls)
**Background**
The system uses a "Registry" pattern to ensure that UI controls (sliders/inputs) are deterministically mapped to the mathematical engine. Without registration, the RID Pipeline will not recognize a state change as a valid intent to ship to the Worker.

**The Workflow**
To add a new parameter (e.g., `twistAmount`):
1.  **Defaults:** Add the key and initial value to `shapingDefaults.json`.
2.  **Registration:** In `src/services/ParametricRegistry.js`, define the parameter's metadata (min, max, step, and internal path).
3.  **UI Linkage:** Use the registered key in the HUD or Slider components. The `updateParametricObjHandler` will automatically detect this key, increment the RID, and trigger the pipeline.

### 2. Kernel Scope Injection (The Math Context)
**Background**
Even if a parameter exists in the Reducer state, it is invisible to the Web Worker unless it is explicitly injected into the "Scope." The Scope is the dictionary of variables available to the math evaluator (e.g., `x`, `y`, `t`, `pinchAmt`).

**The Logic**
In `src/containers/Parametric/ParametricLogic.js`, the `prepareWorkerScope` function acts as the gatekeeper.
*   **Tactics:** When adding a new slider, you must add its key to this function so it is bundled into the `workerDataPacket`.
*   **Standard Variables:** Global variables like `u`, `v`, and `scaleFactor` are injected automatically. Custom parameters must be mapped manually to ensure the Worker stays "lean" and doesn't receive unnecessary data.

### 3. Reducer Helper Protocols (The Dumb Ledger)
**Background**
To maintain Spec 1 (Pipeline Authority), the Reducer must remain a "Dumb Ledger." It should never calculate math or decide if a RID is valid; it simply records what the UI tells it.

**The Implementation**
*   **`setByPath`:** We use a utility in `ParametricReducerHelpers.js` to perform deep updates without mutating the state object.
*   **Consistency:** All updates must be batched. If a slider move changes three values, they must be sent in a single `INTENT_UPDATE` to ensure the RID only increments once.

### 4. HUD Manual Override (The Latch)
**Background**
The system must handle a "handover" between the automated slider logic and the manual text input in the HUD. This is managed by a synchronization "Latch."

**The Mechanics**
*   **The `isManual` Latch:** Clicking into the HUD sets `isManualRef` to `true`. This tells the Formula Invalidation Protocol to ignore slider updates and prioritize the text buffer.
*   **Sync-on-Blur:** When the user clicks away (focus out), the final text string is validated and shipped as the "Authoritative" formula.
*   **The Reset:** Switching shapes via the UI releases the latch and returns the system to "Auto" mode.

### 5. Layout Authority (The "Missing" Mode)
**Tactical Rule:** `LayoutMode` changes must strictly observe `window.innerWidth`. The use of `getBoundingClientRect` for layout decisions is now forbidden to prevent the "Spinning UI" feedback loop.

⚠️ **LAYOUT AUTHORITY:** When extending the UI, never bind visibility to CSS Media Queries alone. Use the `layoutMode` state provided by `Parametric.js` to ensure the JS logic and CSS Grid remain in "Epistemic Sync."

**Forbidden Behavior (Spec 5):** Components must not trigger `shipIntent` inside a standard `useEffect` without a `layoutMode` guard; doing so creates a "Render Loop" that bypasses the 100ms Debounce.

### Summary of Critical Files

| Task | Primary File | Logic to Watch |
| :--- | :--- | :--- |
| Adding Sliders | `ParametricRegistry.js` | Parameter Metadata |
| Adding Math Vars | `ParametricLogic.js` | `prepareWorkerScope()` |
| Deep State Edits | `ParametricReducerHelpers.js` | `setByPath()` utility |
| HUD Logic | `FormulaHUD.js` | Focus/Blur/Latch events |

---

## 6. Parametric System Initial State Setup

### Background (The Why)
A multi-threaded parametric engine cannot rely on a lazy initialization strategy. Because the Execution Layer (Worker) and the Intent Layer (UI) exist in separate memory spaces, the system requires a "Cascade Hydration" process to ensure both sides share the same mathematical constants before the first frame is rendered. This note codifies the sequence that transforms static JSON configuration into a live, synchronized 3D scene.

### The Problem: Cold-Start Desync
In early prototypes, the UI would render before the Worker was ready, or the Worker would execute math using state keys that hadn't been fully mapped by the Registry. This led to "Empty Renders" or "RID 0" states where the 3D scene remained blank until the user manually moved a slider.

### The Fix: Cascade Hydration
The application utilizes a deterministic startup sequence that moves from static configuration to a live execution environment. The transition to **RID: 1** acts as the formal "Bootstrap Signal," forcing the entire pipeline to synchronize immediately upon mounting.

### Component Sequence Flow
1.  **Configuration Ingestion:** The `ParametricIntentService` imports static definitions from `shapingDefaults.json`, `projectionDefaults.json`, and `formulas.json`.
2.  **Canonical State Assembly:** The `getDefaultState()` method merges these JSON structures into a single nested object. This object acts as the system's "Initial Ledger."
3.  **Global Synchronization:** The assembled state is attached to `window.parametricState`. This provides the Playwright test harness and global debug utilities with an immediate architectural baseline.
4.  **React Hydration:** The `Parametric.js` container initializes the `useReducer` hook, passing the Service's default state as the `initialState`.
5.  **Bootstrap Signal:** Once the Three.js scene is ready, the system executes an initial `shipIntent({}, 1)`. This forces the generation of **RID: 1**.
6.  **Geometry Genesis:** The `ParametricLogic` layer receives RID: 1, derives the initial formula strings from the configuration scope, and transmits the packet to the `Parametric.worker`. The Worker executes the math and returns the first vertex buffers to the scene.

### Lifecycle Responsibilities

| Phase | Actor | Responsibility |
| :--- | :--- | :--- |
| **Static State** | `src/config/*.json` | Defines physical bounds, math constants, and projection vectors. |
| **Hydration** | `ParametricIntentService` | Normalizes raw JSON into the internal state schema. |
| **Orchestration** | `Parametric.js` | Manages `ridCounterRef` and coordinates the first "Shipment." |
| **Verification** | `window.parametricState` | Exposes the initialized state for architectural integrity checks. |

### Key Initialization Invariants
*   **RID 1 Implementation:** The system must not remain at RID 0. The transition to RID 1 serves as the mandatory trigger for the first mathematical calculation.
*   **Path Resolution:** The `ParametricRegistry` must be fully loaded to map the keys provided in the JSON defaults to the deep object paths within the Reducer.
*   **Worker Readiness:** The Worker handshake must complete before the Bootstrap Signal is emitted to prevent packet loss during the initial render.

### Troubleshooting Startup Failures
*   **Symptom:** The app loads, but the 3D scene is empty (RID is 0).
    *   **Diagnosis:** The "Bootstrap Signal" in the `useEffect` hook of `Parametric.js` failed to trigger.
    *   **Fix:** Verify that the Three.js `onComplete` callback is firing, as it is the prerequisite for the first `shipIntent`.
*   **Symptom:** The scene renders, but parameters don't match `shapingDefaults.json`.
    *   **Diagnosis:** `getDefaultState()` is likely failing to merge a configuration file, causing the Reducer to fall back to hard-coded values.
    *   **Fix:** Check the console for JSON parsing errors during the Ingestion phase.
