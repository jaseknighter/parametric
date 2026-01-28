# Specification: v0.5.2 Guidance Bridge

## 1. Goal
To unify documentation (README), visual assistance (Tooltips), and non-visual assistance (ARIA) into a single reactive registry.

## 2. Technical Implementation
### 2.1 UI Connectivity
- **Header Alignment:** The `About` link must share a horizontal baseline with the `h1` title using `align-items: baseline`.
- **Targeting:** All external links must use `target="_blank"` with `rel="noopener noreferrer"`.
- **Tooltips:** Sighted users receive an "Enhanced Tooltip" on hover over slider labels, derived from `GUIDANCE_REGISTRY[ID].behavior`.

### 2.2 Accessibility (A11y)
- **Role:** `aria-description` is used to provide the "Intent" string to screen readers upon focus.
- **Math Access:** For "Power Users," the `math` field provides the LaTeX-style formula as a secondary description.

### 2.3 Component Integration
- **HOC Bridge:** `withInterfaceControls` must map the `sectionId` to the Registry key.
- **Dynamic Tooltips:** `MySlider` components must inject Registry data into the `title` attribute for native hover support.

## 3. Visual Requirements
- **Title Sync:** Registry `title` must match the UI label exactly (e.g., "Bend X: Arc Deformation").
- **External Cues:** Links leading to the README should include the `↗` (external) or `ⓘ` (info) visual markers.

## 4. Maintenance
- **README Sync:** A build-time script (v0.5.3) will parse this registry to populate the "Technical Math Reference" section of the repository documentation.

---

PRELIMINARY IMPLEMENTATION DETAILS

/* v0.5.2 Typography & Alignment */
.Header_Cockpit {
  display: flex;
  align-items: baseline; /* 📐 Unified Floor */
  gap: 1.5rem;
}

/* Tooltip Styling for Sighted Users */
.Slider_Label {
  cursor: help;
  position: relative;
  border-bottom: 1px dotted rgba(255, 255, 255, 0.3);
}

/* On Hover: Show Enhanced Registry Info */
.Slider_Label:hover::after {
  content: "ⓘ " attr(data-tooltip); /* Populated via Registry */
  position: absolute;
  bottom: 130%;
  left: 0;
  width: 240px;
  background: #121212;
  border: 1px solid #4da3ff;
  color: #fff;
  padding: 10px;
  font-size: 0.85rem;
  border-radius: 4px;
  z-index: 1000;
  white-space: pre-wrap;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.8);
}