---
applyTo: "data/**/*.yaml,docs/modding/README.md,js/modloader.js,js/systems/event-runner.js,js/modes/mode-combat.js,tests/**/*.js"
---

## BG3-Oriented Mod Design Guidance

When designing or changing mod-facing features, prefer BG3-style behavior and presentation.

### 1. Combat Feel and Action Economy
- Preserve BG3-like combat pacing: a turn should clearly separate movement and action usage.
- Keep action outcomes visible and readable (hit/miss/crit, damage, and status application).
- Avoid hidden side effects that make turn resolution hard to reason about.

### 2. Status-Driven Rules
- Prefer status-based rules over hardcoded special cases.
- If a combat exception exists (for example special crit behavior), model it as a trait/status/ability condition when possible.
- Keep status definitions data-driven in YAML and ensure JS consumes them consistently.

### 3. Mod Data First
- Favor YAML-driven configuration over JS-only behavior for mod-facing mechanics.
- New mod mechanics should be expressible via `creatures.yaml`, `abilities.yaml`, `statuses.yaml`, `rules.yaml`, and stage files.
- If JS changes are required, keep them generic so multiple mods can reuse them.

### 4. Encounter and Stage Design
- Use deterministic test stages for gameplay regressions (fixed positions, stable outcomes).
- Keep mod stages readable: explicit floor identity, encounter intent, and transition links (`nextStage`).
- Validate stage references and metadata through automated tests.

### 5. UX and Feedback
- Provide clear combat-log/status feedback for mod-triggered mechanics.
- Prefer explicit visual feedback for important decisions (movement range, attack range, transitions).
- Maintain consistency with existing BG3-inspired UI patterns already in the project.

### 6. Testing Requirement for Mod Features
- Any new mod-facing feature should ship with at least one corresponding automated test.
- Prefer a unit test for schema/contract behavior and add Playwright for full gameplay flow.
- Regression tests should cover floor transitions, action/movement interactions, and status-driven behavior when touched.
