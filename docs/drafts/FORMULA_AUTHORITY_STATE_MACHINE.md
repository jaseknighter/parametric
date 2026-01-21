# Formula Authority State Machine (DRAFT)

**NOTE: AI generated, still under review.**

This document defines the **Intent-Driven Formula Authority State Machine** for the parametric system, enforcing deterministic control of formula ownership between **STAGE (System)** and **MANUAL (User)** modes.

---
## Background: Why "Simple" Needs Complex
At first glance, the Parametric Geometry App appears to be a straightforward UI. However, as a **Real-Time Mathematical Compiler**, it faces three "Invisible Walls" that require a high-end, intent-driven architecture:

### 1. The Multi-Threaded Math Gap
To prevent the UI from freezing during heavy calculations, the engine is split across two threads.

* **The Conflict:** The UI state is a nested React object (easy for humans), but the geometry engine requires a flat, sanitized numeric scope (fast for math).
* **The JIT Compiler:** The system uses a **Just-In-Time (JIT) Compiler** inside the Web Worker. When you type a formula, it doesn't just "read" it; it wraps your text in a security sandbox and compiles it into a live, high-speed JavaScript function (`new Function`) at runtime.
* **The Shadowing Risk:** A "shadowed" variable occurs if the Worker's internal logic uses a variable name (e.g., `radius` or `i`) that matches a parameter you've defined. If not managed, the JIT kernel will "shadow" (ignore) your input in favor of its own internal value, leading to frozen shapes or "math drift."
* **The Solution:** The **Intent Service** acts as a **Namespace Guard**. It flattens the state into a unique `mathScope` and ensures all internal JIT variables use reserved prefixes (e.g., `__v_`), guaranteeing your parameters are never hidden or "shadowed."



### 2. The Multiplicative Collapse (The "Zero" Problem)
In 3D parametric math, certain values act as "Mesh Collapsers."

* **The Conflict:** If a user swaps a shape or resets a slider, and a parameter like `radius` or `pinchAmt` momentarily hits $0$, the mathematical result is a "collapse" where all vertices jump to the same coordinate, making the object disappear.
* **The Solution:** **Safe Harbor** invariants detect these values during the JIT compilation phase and silently substitute them with the Multiplicative Identity ($1.0$) or a safe epsilon ($\epsilon = 0.001$), ensuring the object remains visible during transitions.

### 3. Authority Desynchronization (The "Tug-of-War")
The app allows two competing ways to define reality: moving sliders (System) and typing code (User).

* **The Conflict:** Without a strict state machine, the system might overwrite your custom code the moment you touch a slider, or a slider might appear "stuck" because manual code has hijacked the engine.
* **The Solution:** The State Machine enforces **Lexical Priority**. In the Worker’s compiled kernel, manual code is appended *after* the slider variables are initialized. This ensures that if both define the same variable, the user's intent wins:
  
  $$V_{final} = V_{manual} \lor V_{slider}$$
  
---

## Design Pattern Philosophy
| Pattern | Role in System | Benefit |
| :--- | :--- | :--- |
| **Command** | `INTENT_UPDATE` | Decouples UI triggers from state mutation. |
| **Strategy** | STAGE vs MANUAL | Swaps the formula-generation algorithm dynamically. |
| **Mediator** | Intent Service | Centralizes unit projections (e.g., $Deg \to Rad$). |
| **Registry** | `ParametricRegistry` | Maps human-readable keys to deep state paths. |



---

## The States

### STAGE (System Authority)
* **Source:** Generated via `Formulas.generateFormulaString`.
* **Control:** Sliders drive the state tree and the math.
* **HUD Behavior:** Read-only documentation of system math.

### MANUAL (User Authority)
* **Source:** Authored directly in the HUD textarea.
* **Control:** Sliders update state but are overridden by HUD text in the Worker.
* **Trigger:** Activated by an `INTENT_UPDATE` where `userEdit: true`.
* **Lexical Guard:** To prevent jumps on focus, the first "Focus" event is read-only (`beginEdit`); only subsequent typing (`userEdit`) triggers authority.

---

## UML State Transitions



1. **STAGE → MANUAL**: Triggered when the user types in the HUD (`userEdit: true`).
2. **MANUAL → STAGE**: Triggered by moving any slider (`isManual: false`) or clicking "Restore Sync".

---

## Intent-Driven Architecture

| Layer | Responsibility | Convergence Invariant |
| :--- | :--- | :--- |
| **HUD / View** | Capture Intent | Dispatches `userEdit` to bypass the Focus Guard. |
| **Reducer** | Path Resolution | Uses Registry to find the nested path. |
| **Intent Service**| Safe Harbor | Projection: Converts UI units to Math units. |
| **Logic Layer** | Scope Preparation | Returns a pure numeric `mathScope`. |
| **Worker** | Execution | **Priority:** `destructure(scope)` $\to$ `exec(manualFormula)`. |

---

## Recovery Logic (Manual Error Handling)
1.  **The Worker-Side Catch:** Worker wraps execution in `try...catch`. On fail, it posts an `ERROR` message.
2.  **The Signaling Bridge:** `Parametric.js` catches the Worker error and updates `hudState.isValid = false`.
3.  **Visual Feedback:** The `.Status_Dot` class transitions to `Invalid` (Red) or `MathError`.
4.  **The Escape Hatch:** Any slider movement restores `STAGE` authority and clears the error.

---

## Mathematical Invariants
| Parameter | Type | Invariant / Smoke Test | Purpose |
| :--- | :--- | :--- | :--- |
| `pinchAmt` | Multiplier | If $x = 0 \to x = 1.0$ | Prevents mesh collapse. |
| `radius` | Scalar | $0.001 \le r \le 50.0$ | Prevents infinite scale. |
| `mathScope` | Object | `typeof val === 'number'` | Prevents kernel crashes. |

---

## Developer Onboarding: Adding a "Twist" Deformation

### 1. Register the Intent
```javascript
// src/services/ParametricRegistry.js
export const ParametricRegistry = {
  twistAmt: { 
    path: "instructions.deforms.twist.amt",
    projection: "radians", // Degrees to Radians auto-conversion
    default: 0 
  }
};

### 2. Update the UI

<Slider 
  label="Twist"
  onChange={(val) => dispatch({ 
    type: 'INTENT_UPDATE', 
    intentKey: 'twistAmt', 
    value: val 
  })}
/>

### 3. Implement Math Logic

[cite_start]The service projects the value, so the formula can use it directly: [cite: 6]

const twistDeform = (code, scope) => {
  [cite_start]// 'twistAmt' is already a radian number thanks to the Service [cite: 6]
  [cite_start]if (scope.twistAmt === 0) return code; [cite: 6]
  [cite_start]return `rotateZ(${code}, ${scope.twistAmt} * v)`; [cite: 6]
};

### 📚 Developer FAQ

[cite_start]**Q: Why not setState?** **A:** Using setState directly bypasses the Safe Harbor. [cite: 6] [cite_start]You lose the automatic degree-to-radian conversion, and more importantly, you won't generate a new RID (Request ID) authority, meaning the Web Worker will never know it needs to recalculate the 3D object. [cite: 7]

[cite_start]**Q: Why did my HUD turn red?** **A:** The Worker-Side Catch wraps execution in a try...catch. [cite: 5] [cite_start]If the math fails or a security violation occurs (e.g., using fetch), the system dispatches an ERROR_SYNC to the Reducer, turning the HUD border red. [cite: 5] [cite_start]Check the console for the "Worker Error" log. [cite: 5]