# 🛠️ OBSERVABILITY.md (DRAFT)

**NOTE: AI generated, still under review.**

## Purpose
This document establishes the "Non-Interference" contract for the Parametric Engine. It ensures that monitoring, logging, and forensic recording never compromise the deterministic execution of the math worker or the responsiveness of the UI.

---

## 1. The Observational Purity Contract
**Assertion:** Observability code must be strictly passive. It is a "one-way mirror" that sees the system but cannot influence it.

### Constraints:
- **Zero Mutation:** Debug code must never call `dispatch`, `update`, or write to any `parametricState`.
- **Zero Authority:** No production logic may branch based on whether a debug channel is enabled (e.g., `if (Debug.enabled)` inside a math loop is forbidden).
- **Zero Synthesis:** Debuggers may record user intent but must never replay, create, or "fix" intent to resolve a perceived error.

---

## 2. The Central Channel Authority
To prevent "Log Chaos" and "Channel Drift," all observability signals must utilize the registry defined in `ParametricConstants.js`.

### Valid Debug Channels:
| Channel | Source of Truth | Operational Context |
| :--- | :--- | :--- |
| **`WORKER`** | `ParametricConstants` | JIT compilation, buffer transfers, and vertex math execution. |
| **`CONTRACT`** | `ParametricConstants` | RID synchronization and State Invariant validation. |
| **`LOGIC`** | `ParametricConstants` | Formula string generation and math wrapper efficiency. |
| **`DISPLAY`** | `ParametricConstants` | **Layout shifts, ResizeObservers, and UI Breakpoint logic.** |
| **`AUTHORITY`** | `ParametricConstants` | Focus locks between the Reducer and the Manual HUD. |
| **`PIPELINE`** | `ParametricConstants` | Geometry injection and Viewport-fitting math. |
| **`INTENT`** | `ParametricConstants` | User input capturing and event "shipping" to the worker. |

---

## 3. Debugging the "Flicker & Drift" (DISPLAY Dashboard)
The `DISPLAY` channel is specifically designed to diagnose layout authority conflicts. When debugging window resizing or mobile transitions, look for these markers in the console:

* **`[UI] Layout shift detected`**: Indicates the `ResizeObserver` in the Interface has fired.
* **`[Viewport] Resize Event`**: Indicates the 3D Renderer is recalculating its aspect ratio and canvas dimensions.
* **`[Camera] Refit successful`**: Confirms the camera has recalculated its FOV/Distance and re-centered on the World Anchor `(0,0,0)`.

**Triangulation Rule:** If a `[UI]` shift occurs without a subsequent `[Camera]` refit, the link between the Interface and the Scene Manager is broken. If multiple `[Viewport]` events fire within 16ms, the `requestAnimationFrame` throttle is failing, causing flicker.

---

## 4. Performance & Backpressure Guardrails
**Assertion:** The engine must behave identically (within 1ms jitter) regardless of whether diagnostics are active.

### Implementation Rules (via `debug.js`):
- **Channel Throttling:** Non-critical channels (like `VIEW` or `WORKER`) must use `_throttles` or `tlog()` to prevent Console Buffer Bloat, which can freeze the Main Thread.
- **Heartbeat Logic:** Logs occurring within an animation loop are automatically prefixed with `[ANIMATION HEARTBEAT]` and throttled to their defined `DEBUG_THROTTLES` interval (e.g., 100ms).
- **Async Prohibition:** `await` and `Promises` are strictly forbidden in any diagnostic path to avoid blocking the `requestAnimationFrame` loop.



---

## 5. Forensic Snapshot Contract
Forensic mode records system activity without influencing execution. These records are immutable and append-only.

### Snapshot Schema (Version 1.0):
| Field | Type | Description |
| :--- | :--- | :--- |
| `ts` | Number | High-resolution timestamp (`performance.now()`). |
| `rid` | Number | The Request ID associated with the specific geometry generation. |
| `params` | Object | Numeric-only snapshot of the parametric variables (e.g., `pinchAmtX`). |
| `workerState` | String | Current status of the worker (`IDLE`, `BUSY`, or `REBOOTING`). |

---

## 6. The "Manual Override" Protocol
`debug.js` supports high-frequency logging for deep-dive debugging via the `{ __isManual: true }` flag.

**Policy:**
- **Development Only:** Manual overrides must be stripped or disabled before a production tag is issued.
- **Bypass Rule:** Only `Debug.error()` bypasses all filters, as it represents a critical system signal.
- **Metadata Stripping:** The `__isManual` metadata object is popped from the arguments list before logging to keep the console output clean.

---

## 7. Architectural Guardrails
1. **LIFO Integrity:** A forensic log where a `COMPLETE` event arrives for an older `RID` indicates a generation-tracking failure.
2. **Environment Agnostic:** Producers must emit debug events without checking environment flags. The `Debug` utility handles the "if enabled" logic internally to keep the business logic clean.
3. **Runtime Assertions:** Development builds must include `console.assert` checks to ensure diagnostics are not granted `dispatch` authority.



---

## 8. Implementation Reference (`debug.js`)
The observability system is built on a "Lightweight Channel" model:
* **`log(channel, ...args)`**: Standard throttled logging.
* **`tlog(channel, ms, ...args)`**: Ad-hoc throttling for specific high-frequency variables.
* **`error(channel, ...args)`**: Immediate, non-throttled critical signal.