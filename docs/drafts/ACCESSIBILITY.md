# Accessibility Hardening Specification (v0.5.1)

This document outlines the accessibility enhancements implemented in version 0.5.1 to ensure the Parametric Engine is usable via keyboard navigation and assistive technologies.

## 1. Core Principles

*   **Semantic Integrity:** Use native HTML elements (`<button>`, `<label>`) and ARIA roles (`role="region"`, `role="application"`) to convey meaning.
*   **Focus Management:** Ensure a logical tab order that follows the visual layout and prevents focus traps.
*   **State Communication:** Announce dynamic state changes (e.g., drawer expansion, formula errors) to screen readers.
*   **Keyboard Operability:** All interactive elements must be reachable and operable via keyboard.

## 2. Implementation Details

### 2.1. Feature Flagging
All accessibility enhancements are gated behind the `accessibilityHardening` feature flag to allow for safe, incremental rollout and testing.

### 2.2. Interface Drawers (Navigation)
*   **Toggle Buttons:**
    *   `aria-expanded`: Indicates whether the drawer is currently open.
    *   `aria-controls`: Links the button to the content region it controls.
    *   `aria-label`: Provides a descriptive label (e.g., "Open Shape controls").
*   **Content Regions:**
    *   `role="region"`: Defines the drawer content as a landmark.
    *   `aria-hidden`: Hides the content from assistive technology when closed.
    *   **Focus Management:** Hidden content is removed from the tab order (`display: none`) to prevent "ghost tabbing."

### 2.3. Sliders (Input)
*   **Labels:** Each slider has a unique ID generated from its group and axis (e.g., `label-BEND-X`).
*   **Association:** The slider input (handle) uses `aria-labelledby` to reference its corresponding label ID.
*   **Roles:** Handles have `role="slider"` with `aria-valuemin`, `aria-valuemax`, and `aria-valuenow`.

### 2.4. HUD (Heads-Up Display)
*   **Header:**
    *   `role="button"`: Acts as a toggle for the editor.
    *   `tabIndex="0"`: Made focusable for keyboard users (only when A11y flag is active).
    *   `aria-expanded`: Indicates editor visibility.
    *   **Keyboard Support:** Activates on `Enter` or `Space`.
*   **Editor:**
    *   `aria-label`: "Mathematical Formula Editor".
    *   **Escape Hatch:** Pressing `Escape` inside the editor returns focus to the header, preventing a focus trap.

### 2.5. WebGL Canvas
*   `role="application"`: Identifies the canvas as a complex interactive element.
*   **Dynamic Description:** The `aria-label` updates in real-time to reflect the current shape (e.g., "Interactive 3D SINE") and mathematical stability ("Stable" vs "Error").
*   **Semantic Parallelism:** A hidden "Shadow DOM" description (`<section class="sr-only" aria-live="polite">`) provides deeper context, including the current shape name, resolution, and transformation status. This ensures screen readers can access the "state" of the 3D object without relying on visual interpretation of the canvas.
*   **Keyboard Rotation:** Arrow keys rotate the 3D model when the canvas has focus, fulfilling the "Use arrow keys to rotate" instruction.
*   **Keyboard Zoom:** `Shift + ArrowUp` zooms in, `Shift + ArrowDown` zooms out when the canvas has focus.

### 2.6. Live Telemetry
*   **Status Indicator:** Uses `aria-live="polite"` to announce system status changes (e.g., "PROCESSING", "IDLE") without interrupting the user.

### 2.7. Global Navigation
*   **Landmark Shortcuts:**
    *   `Alt+I`: Jump to Interface (First Drawer).
    *   `Alt+H`: Jump to HUD Header.
    *   `Alt+C`: Jump to WebGL Canvas.

## 3. Verification

### 3.1. Automated Tests (Playwright)
*   **`tests/accessibility.spec.js`:** Validates the presence and correctness of ARIA attributes on drawers, sliders, canvas, and telemetry.
*   **Focus Loop Detection:** Tests ensure that tabbing cycles correctly and does not get trapped in the HUD.
*   **Shortcut Verification:** Tests verify global shortcuts move focus as expected.

### 3.2. Manual Verification
1.  Enable the flag: `?flag_on=accessibilityHardening`.
2.  **Tab Navigation:** Verify you can tab through the HUD header, into the editor, out (via Escape/Tab), and into the bottom interface buttons.
3.  **Screen Reader:** Verify that drawer toggles announce their state ("expanded"/"collapsed") and sliders announce their labels.