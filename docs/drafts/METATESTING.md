# Meta Testing Specs / Plans: Parametric Authority  (DRAFT)

**NOTE: AI generated, still under review.**

## v0.5.4 — **REVISED, REFINED, & "EPISTEMICALLY BOUNDED"**

**NOTE: Strategic shift from Path Coverage to Decision / Intent Coverage.**

This plan represents a shift from *“did the code run?”* to *“does the code plausibly implement what we claim it is doing?”*. By implementing **Heuristic Intent Validation**, we introduce **concrete double-loop learning**: questioning not only application behavior, but the reliability and truthfulness of the test suite itself.

> **Key Boundary:**
> v0.5.4 meta-tests **do not assert application correctness**. They assert **internal consistency between declared test intent and observable test implementation signals**.

---

## Table of Contents

- [Meta Testing Specs / Plans: Parametric Authority  (DRAFT)](#meta-testing-specs--plans-parametric-authority--draft)
  - [v0.5.4 — **REVISED, REFINED, \& "EPISTEMICALLY BOUNDED"**](#v054--revised-refined--epistemically-bounded)
  - [Table of Contents](#table-of-contents)
  - [Summary / Intent](#summary--intent)
  - [🏛️ v0.5.4 Quality Autopilot: Strategic Plan](#️-v054-quality-autopilot-strategic-plan)
    - [Guiding Principle](#guiding-principle)
  - [1. Intent Validation Heuristics (Phase 2 Upgrade)](#1-intent-validation-heuristics-phase-2-upgrade)
    - [Regex Limitation Note](#regex-limitation-note)
  - [2. Detection of Weak Assertions](#2-detection-of-weak-assertions)
  - [Intent–Implementation Alignment (Heuristic Grading)](#intentimplementation-alignment-heuristic-grading)
  - [Tool Evaluation \& Future-Proofing](#tool-evaluation--future-proofing)
    - [The Scanner](#the-scanner)
    - [The Informer](#the-informer)
    - [The Gatekeeper](#the-gatekeeper)
  - [Implementation Payload (Reference Logic)](#implementation-payload-reference-logic)
  - [Meta-Testing Validation Requirements (Meta-Meta-Testing)](#meta-testing-validation-requirements-meta-meta-testing)
  - [Mock Tests](#mock-tests)
  - [Hand-off Instructions](#hand-off-instructions)
  - [Next Steps: PoC Meta-Testing for v0.5.4](#next-steps-poc-meta-testing-for-v054)
    - [Step 1 — Automated Audit](#step-1--automated-audit)
    - [Step 2 — README Summary (Heuristic)](#step-2--readme-summary-heuristic)
    - [Step 3 — MetaMetaTesting (Unit Tests for MetaTests)](#step-3--metametatesting-unit-tests-for-metatests)
    - [Step 4 — Usage Policy](#step-4--usage-policy)
    - [Step 5 — README Framing](#step-5--readme-framing)

---

## Summary / Intent

The goal of this meta-testing plan is to ensure that **every test communicates and plausibly enforces a meaningful intent**, defined as one of:

* a **behavior contract**
* a **policy / architectural decision**
* a **failure mode**

Tests that do not meet these criteria are flagged as `[suspect]`.

The audit process is **self-healing**:

* it never halts execution by default,
* it degrades findings to warnings,
* and it emits sufficient diagnostic context to guide remediation.

> **PoC Scope (v0.5.4):**
> Meta-tests identify **risk signals and direction**, not truth. They help answer *“Where should we invest next?”*, not *“Is this correct?”*.

---

## 🏛️ v0.5.4 Quality Autopilot: Strategic Plan

### Guiding Principle

> **Improve confidence by testing decisions, not paths.**

A test provides value only if its **implementation plausibly supports its declared intent**.
When a test claims intent but lacks corresponding implementation signals, it is flagged as:

```
[mismatched-intent]
```

This is a **consistency failure**, not a correctness failure.

---

## 1. Intent Validation Heuristics (Phase 2 Upgrade)

To prevent intent tags from becoming decorative, the audit script (`analyze-tests.cjs`) performs a **heuristic scan** of each test body for **implementation markers** associated with the declared intent.

| Tag                  | Heuristic Implementation Markers                             | Interpreted Intent                                     |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------------------ |
| **`[behavior]`**     | `fireEvent`, `userEvent`, `click`, `fill`, `press`, `page.`  | A user action causes a visible or observable outcome   |
| **`[policy]`**       | `toThrow`, `ReadOnly`, `frozen`, `Boundary`, `expect.extend` | An invariant or architectural rule is enforced         |
| **`[failure-mode]`** | `error`, `NaN`, `terminate`, `Infinity`, `invalid`, `spyOn`  | The system responds to an invalid or hostile condition |

> **Heuristic Boundary:**
> Presence of markers **does not prove intent correctness**.
> Absence of markers **invalidates the claim that the test enforces that intent**.

### Regex Limitation Note

v0.5.4 relies on Regex-based scanning.
Multiline, higher-order, or dynamically generated tests may evade detection.
This is acceptable for the PoC and explicitly logged when detected.

---

## 2. Detection of Weak Assertions

A tagged test may still be downgraded to `[suspect]` if it performs only **existence-level assertions**.

**Weak Assertion Markers**

* `toBeDefined`
* `toBeTruthy`
* `toBeFalsy`
* `not.toBeNull`

**Minimum Requirement**

* At least one **decision-bearing assertion** (`toEqual`, `toContain`, `toThrow`, `toMatchSnapshot`, etc.)

This ensures the test asserts **something falsifiable**, not merely that execution occurred.

---

## Intent–Implementation Alignment (Heuristic Grading)

To avoid binary “pass/fail” outputs, tagged tests are graded:

| Grade             | Criteria                                | Meaning                                       |
| ----------------- | --------------------------------------- | --------------------------------------------- |
| 🟢 **STRONG**     | Tag + intent markers + strong assertion | Plausible enforcement of declared intent      |
| 🟡 **WEAK**       | Tag + markers + only weak assertions    | Correct category, low evidentiary value       |
| 🔴 **MISMATCHED** | Tag present, no markers                 | Declared intent unsupported by implementation |

> **Important:**
> This grading measures **internal consistency**, not software quality.

---

## Tool Evaluation & Future-Proofing

### The Scanner

* **v0.5.4:** Regex-based Node script
* **Future:** AST analysis / ESLint rule for IDE-time feedback

### The Informer

* **v0.5.4:** Reads existing Jest / coverage artifacts
* **Future:** Visual correlation of intent coverage vs path coverage

### The Gatekeeper

* **v0.5.4:** Informational only
* **Future:** CI comments or soft-fail thresholds once signal stabilizes

---

## Implementation Payload (Reference Logic)

```js
const SEMANTIC_RULES = {
  behavior: ['fireEvent', 'userEvent', 'click', 'fill', 'press', 'page.'],
  policy: ['toThrow', 'ReadOnly', 'frozen', 'Boundary'],
  'failure-mode': ['error', 'NaN', 'terminate', 'Infinity', 'invalid']
};

const WEAK_ASSERTIONS = [
  'toBeDefined',
  'toBeTruthy',
  'toBeFalsy',
  'not.toBeNull'
];

function gradeIntentAlignment(testName, testBody) {
  const tagMatch = testName.match(/\[(behavior|policy|failure-mode)\]/i);
  if (!tagMatch) return { status: 'suspect', reason: 'untagged' };

  const tag = tagMatch[1].toLowerCase();
  const hasMarker = SEMANTIC_RULES[tag].some(m => testBody.includes(m));
  if (!hasMarker) return { status: 'suspect', grade: 'MISMATCHED', tag };

  const hasStrongAssertion =
    testBody.includes('expect(') &&
    !WEAK_ASSERTIONS.every(w => testBody.includes(w));

  return hasStrongAssertion
    ? { status: 'valid', grade: 'STRONG', tag }
    : { status: 'suspect', grade: 'WEAK', tag };
}
```

---

## Meta-Testing Validation Requirements (Quality Pipeline Self-Validation)

| Requirement              | Assertion                                     |
| ------------------------ | --------------------------------------------- |
| Tag detection            | Tagged tests are classified                   |
| Mismatch detection       | Missing markers produce `MISMATCHED`          |
| Weak assertion detection | Existence-only assertions downgrade           |
| Determinism              | Same input → same audit output                |
| Scope control            | Only GeometryBuilder & Worker asserted in PoC |

---

## Mock Tests

Located in `tests/mock-meta/` to isolate auditor behavior.

```js
test('[behavior] should respond to click', () => {
  fireEvent.click(button);
  expect(button).toBeDefined();
});

test('[policy] enforces immutability', () => {
  Object.freeze(obj);
  expect(() => obj.x = 1).toThrow();
});

test('untagged test', () => {
  expect(1).toBe(1);
});
```

---

## Hand-off Instructions

1. Refactor `analyze-tests.cjs` to emit **grade + reason**
2. Default severity = **WARNING**
3. Add `--strict` flag for CI
4. Inject summary table into README
5. Ensure metametatests run via Jest

---

## Next Steps: PoC Meta-Testing for v0.5.4

### Step 1 — Automated Audit

```bash
npm run test:audit -- --table
```

### Step 2 — README Summary (Heuristic)

| Metric                                      | Result                  |
| ------------------------------------------- | ----------------------- |
| Total Tests                                 | 297                     |
| Intent–Implementation Alignment (Heuristic) | 🔴 12%                  |
| Strong Assertion Ratio                      | ⚠️ 45%                  |
| PoC Focus Areas                             | GeometryBuilder, Worker |

### Step 3 — Quality Pipeline Self-Validation (Unit Tests for MetaTests)

Meta-tests assert **auditor behavior**, not application behavior.

### Step 4 — Usage Policy

* Local: warnings only
* CI: informational
* Future: gated once signal stabilizes

### Step 5 — README Framing

> **v0.5.4 Meta-Testing (PoC)**
> These tests audit the *tests themselves*. They do not assert correctness, only whether declared intent is plausibly implemented. Their purpose is directional, not authoritative.

---
