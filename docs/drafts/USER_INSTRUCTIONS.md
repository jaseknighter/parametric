# Instructional Registry - 0.5.2 (DRAFT)

**NOTE: AI generated, still under review.**

## Instructional Summary: The "Why" over the "How"
The core philosophy of this refinement is Intent-Based Guidance. Instead of telling a user that a slider moves from 0 to 1, we explain that it "Concentrates points toward an axis origin." This connects the user’s creative intuition directly to the underlying GLSL-style vertex manipulation.

## 📝 Implementation Plan: Instructional Refinement
### Phase 1: Shared Content Contract (README Sync)
*   **Contractual Integrity:** Before UI implementation, a Jest test suite must verify that the `GUIDANCE_REGISTRY` contains all 9 required transformation entries.
*   **Structural Verification:** A test will verify that the `README.md` contains a "Mathematical Reference" section and that every entry in the Registry has a corresponding row in the README table.
*   **No Drift Policy:** Tests will fail if the README contains transformation documentation that is not present in the Registry, preventing "stale" instructions.
*   **Source of Truth:** The registry is a JavaScript file (`GUIDANCE_REGISTRY.js`) that exports an object. The README is a derived artifact.

### Phase 2: Landmark & Drawer Integration
We will treat the Drawer Titles and the HUD Header as the primary "Learning Landmarks."
*   **The HOC Bridge:** Update `withInterfaceControls.js` to look up the `sectionId` (e.g., `bend`) in the `GUIDANCE_REGISTRY` (e.g., `BEND_DRAWER`).
*   **ARIA Injection:** Apply `registry.intent` to the `aria-description` of the section container. This allows Screen Readers to narrate the "Why" immediately upon the user tabbing into the drawer.
*   **Behavioral Tooltips:** Apply `registry.behavior` (which now includes the raw math) to the drawer’s title button `title` attribute for sighted users.

### Phase 3: HUD Instructional Gateway
The HUD Editor itself will remain "silent" to allow for deep focus, but the HUD Title will act as the instructional gateway.
*   **Registry Hook:** Map the HUD Header to `HUD_TITLE`.
*   **Connectivity:** The "About" link in the HUD Header will point to the link provided in the registry, ensuring the user can jump to the "Formula Editor" section of the README with one click.
*   **Baseline Alignment:** (Visual requirement) 3rem Title + 12pt "about" link sharing a unified horizontal floor.


## 🛠️ Technical Specification: Component Logic

| Component | Technical Logic | Instructional Statement of Intent |
| :--- | :--- | :--- |
| **Integrity Tests** | `expect(registry).toHaveProperty('behavior')` | Contractual Safety: Ensure the Registry is valid before consumption. |
| **README Table** | `extractTableRows(readme)` | Zero-Drift: Ensure documentation matches runtime code exactly. |
| **Drawer Header** | `aria-describedby={reg.intent}` | To provide a "Mental Map" before interaction begins. |
| **Drawer Content** | `MathTooltip(intent, behavior)` | To provide "Just-in-Time" **formatted** math education with an **Adaptive Delay** (0ms for first 6 hovers, 1s thereafter). |
| **Tooltip Accessibility** | `role="tooltip"` + `aria-hidden` + focus handlers | To ensure instructional math is available to keyboard and screen reader users. |
| **HUD Header** | `align-items: baseline` | To unify the Title and "About" link into a professional floor. |
| **README Links** | `href={reg.link}` | To provide an "Escalation Path" for deep documentation. |

## 🎨 Visual Alignment: The "Unified Floor"
To satisfy the v0.5.2 aesthetic, the Header and HUD Title components must implement the baseline alignment strategy. This ensures that the documentation "about" link feels structurally integrated rather than floating.

```javascript
// Header Implementation Example
<div className="Header_Layout" style={{ display: 'flex', alignItems: 'baseline', gap: '1rem' }}>
  <h1 style={{ fontSize: '3rem', margin: 0 }}>PARAMETRIC</h1>
  <a 
    href={GUIDANCE_REGISTRY.HUD_TITLE.link} 
    target="_blank" 
    rel="noopener" 
    style={{ fontSize: '12pt', textDecoration: 'underline' }}
  >
    about
  </a>
</div>
```

---

DRAFT IMPLEMENTATION NOTES

Short answer: **yes, it changes the guidance slightly — but in a clarifying, not disruptive way.**
The good news is your overall plan is still correct. The adjustment is mostly about **what we count and how we test**, not about reversing direction.

Let me walk you through it cleanly.

---

## 1️⃣ What Changed Conceptually

### Earlier assumption (now outdated)

I previously assumed the registry was **only transformation math entries** (≈9 items like bend, twist, etc.).

### Reality (from your registry)

Your registry is **broader and more powerful**:

* It contains **learning landmarks**, not just transformations
* It includes:

  * **HUD landmark** (`HUD_TITLE`)
  * **Interface drawers** (some math-heavy, some not)
  * **Non-math operational drawers** (`SHAPE`, `PROJECT`, `EXPORT`)

This is *better design* — it just means **Stage 1 tests must be scoped more precisely**.

---

## 2️⃣ Key Insight (Important)

> **Not everything in `GUIDANCE_REGISTRY` belongs in the README “Mathematical Reference” table.**

And that’s totally okay.

The registry is the **instructional superset**.
The README math table is a **filtered projection** of it.

So instead of:

> “README must mirror the entire registry”

We refine the contract to:

> **README must mirror the registry entries that declare mathematical behavior**

---

## 3️⃣ The Correct Adjustment (Minimal but Critical)

### Add an explicit discriminator

You already implicitly have it:

* Math drawers have **LaTeX math in `behavior`**
* Non-math landmarks do not

But tests should not rely on heuristics.

**Recommended (lightweight, future-proof):**

Add a flag to registry entries that belong in the math table:

```js
BEND_DRAWER: {
  title: "Bend: Curvature & Arching",
  intent: "...",
  behavior: "...",
  link: "./README.md#bending",
  math: true
}
```

Non-math entries simply omit it (or `math: false`).

This is a *documentation contract*, not UI logic.

---

## 4️⃣ Revised Stage 1 Test Strategy (Aligned with Your Registry)

### ✅ Test A — Registry Integrity (unchanged, still correct)

```js
expect(GUIDANCE_REGISTRY).toHaveProperty('HUD_TITLE');
expect(GUIDANCE_REGISTRY).toHaveProperty('BEND_DRAWER');
// etc.
```

Also keep the **shape test**:

* `title`
* `intent`
* `behavior`
* `link`

This still stands exactly as written before.

---

### ✅ Test B — Mathematical Reference Coverage (updated)

Instead of “all registry entries”, we now assert:

> **All `math: true` registry entries must appear in the README table**
> **No README table rows may exist without a matching `math: true` registry entry**

#### Example test logic

```js
const mathRegistryEntries = Object.values(GUIDANCE_REGISTRY)
  .filter(entry => entry.math === true);

it('README includes all math registry entries', () => {
  mathRegistryEntries.forEach(entry => {
    expect(readmeTableText).toContain(entry.title);
  });
});

it('README contains no undocumented math rows', () => {
  readmeTableRows.forEach(row => {
    const matchesRegistry = mathRegistryEntries
      .some(entry => row.includes(entry.title));

    expect(matchesRegistry).toBe(true);
  });
});
```

This preserves your **No Drift Policy** without over-constraining the system.

---

## 5️⃣ What Does *Not* Change

✔ The registry is still the **single source of truth**
✔ README is still a **derived artifact**
✔ Tests still fail before UI changes
✔ Stages 2 and 3 are unaffected
✔ Your instructional philosophy (“Why over How”) is reinforced

---

## 6️⃣ Why This Is Actually a Stronger Architecture

Your registry is doing **three jobs** now:

1. **Instructional intent** (ARIA, screen readers)
2. **Behavioral explanation** (tooltips, curiosity hooks)
3. **Documentation routing** (README deep links)

By scoping the README sync to *math-bearing entries only*, you avoid:

* forcing EXPORT into a math table
* polluting docs with non-transformational concepts
* future friction when new landmarks are added

This is the right abstraction boundary.

---

## Next Step #1 (Concrete)

**Before writing tests*: do one of the following (your choice):

Add `math: true` to:

* `BEND_DRAWER`
* `PINCH_DRAWER`
* `TEXTURE_DRAWER`
* `SPIRAL_DRAWER`
* `MODULATE_DRAWER`
* `FLATTEN_DRAWER`
  *(and any others you consider mathematical)*

Option A is better for long-term clarity and automation.

---

## Next Step #2 (Concrete)

* write the **exact Jest test file** for Stage 1
* propose the **README table schema** that best matches your registry
* sanity-check which drawers *should* be `math: true` and report back on your findings

We are in a very good place architecturally — this registry is doing real work now, not just documentation.
