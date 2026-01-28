# Tooltip Math Visualizer (post 5.0.X DRAFT)

**NOTE: AI generated, still under review.**

## Purpose

Provide interactive, visual explanations of mathematical formulas in tooltips.  
Transforms abstract formula snippets into intuitive, animated demonstrations, helping both experts and beginners understand the effects of parameters in the 3D parametric engine.

NOTE: the logic can also be added to the README
---

## Features

### 1. Mini 2D/3D Canvas in Tooltips

- Embed a small canvas (150x150px) inside each tooltip with a formula.
- Canvas shows a live animation of the formula's effect.
- Animation loops continuously when tooltip is visible; pauses when hidden to save CPU.

### 2. Supported Animations

Each drawer’s formula maps to a simple animated visualization:

| Drawer | Formula Example | Visualization |
|--------|----------------|---------------|
| Bend | `theta = (v - 0.5) * amt * scalar; x' = dist * cos(theta)` | Line or circle segment bending along an arc. |
| Pinch | `v' = sgn(v) * |v|^(1.0 + (amt * scalar)) * n` | Vertices moving toward a center point, demonstrating compression/tapering. |
| Texture | `1.0 + (sin(u) * cos(v) * outerAmt) + ...` | Wave ripples along a surface polygon. |
| Spiral | `theta' = atan2(B, A) + (amt * r * scalar)` | Points rotating around a center to show twisting. |
| Modulate | `Delta = sin(u * freq) * cos(v * freq) * amt` | Secondary wave oscillations overlaid on a shape. |
| Flatten | `v' = v * (1.0 - amt)` | Vertices compressed along one axis. |

### 3. Engine Requirements

- Lightweight rendering engine:
  - Full Three.js optional; Canvas 2D or PixiJS preferred for simplicity.
  - Supports vertices, basic shapes, and transformations.
- Minimal CPU usage:
  - Only animate when tooltip is open.
- Adjustable parameters:
  - Map `amt`, `scalar`, `freq`, etc., to slider-controlled values in demo (optional for interactivity).

### 4. UX Guidelines

- Tooltip canvas should be **small and elegant** (~150x150px).
- Use **simple color scheme**: black or colored vertices on white/transparent background.
- Continuous but subtle animation, not distracting.
- Optional hover slider to explore parameter ranges interactively.

### 5. Implementation Notes

- Each formula maps to a visualization function:
  ```javascript
  function animatePinch(vertices, amt, scalar) {
      vertices.forEach(v => {
          v.x = Math.sign(v.x) * Math.pow(Math.abs(v.x), 1 + amt * scalar);
          v.y = Math.sign(v.y) * Math.pow(Math.abs(v.y), 1 + amt * scalar);
      });
  }
  ```