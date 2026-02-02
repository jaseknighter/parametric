# TODO

- [ ] Clean up test output in the console (reduce noise, consolidate logs).
- [ ] **Accessibility (System Universalization):** Ensure the HUD and Sidebar states are announced correctly for screen readers, allowing the engine's mathematical state to be understood non-visually. (Aria tagging completed with 0.5.1. Acceptance testing not completed.)
- [ ] **Fidelity:** Shift from "existence" testing to "accuracy" testing via predicate-based numerical validation. (POC live with 0.5.4. Evaluation Underway.)
- [ ] **State Serialization (Social Math):** Implement URL-based state persistence. By injecting interface parameters (rotation, zoom, HUD formulas) into the URL, users can bookmark specific geometric states, share designs via a single link, and contribute to a community gallery of mathematical forms.
- [ ] **Observability:** Implement a "Black Box" flight recorder to capture math failures in the wild.
- [ ] **Performance:** Determine maximum vertex ceilings per device and monitor garbage collection pressure during animations.
- [ ] **Retrospective Issue Generation:** Scripted creation of resolved GitHub issues based on analysis of the repository's commit history to backfill the project board.
- [ ] **Test Mutation:** Implement mutation testing (e.g. StrykerJS) to verify test quality.
- [ ] **Feature Flag Cleanup:** Create a test that checks tests for feature flag flips that are no longer required because the flags are set to 'ON'.