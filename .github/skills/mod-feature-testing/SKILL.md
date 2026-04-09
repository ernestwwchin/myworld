---
name: mod-feature-testing
description: "Use when adding or changing mod features, stage YAML, creatures, items, rules, events, or other mod data. Ensures every mod-facing feature ships with a matching unit test and, when useful, a deterministic Playwright regression test."
---

# Mod Feature Testing

Use this skill whenever a change affects the modding surface: YAML schema, stage metadata, content loading, stage transitions, event wiring, creature definitions, loot tables, or any other mod-authored feature.

## Rule

If a feature can be added by editing mod data, it should usually gain a respective automated test in the same change.

## Testing Strategy

1. Prefer a unit test first.
2. Add an end-to-end Playwright test when the behavior depends on real scene flow, rendering state, transitions, or browser interaction.
3. Use deterministic test stages under `data/00_core_test/stages/` for mod-facing gameplay regressions.

## Unit Test Guidance

- Put data and schema regressions in `tests/unit/`.
- Use built-in `node:test` with `node:assert/strict` unless the repository has already standardized on another framework.
- Validate the mod contract directly: referenced stages exist, `nextStage` targets are valid, events files exist, YAML shape is correct, and required fields are present.
- Keep tests narrow and explain the modding rule through the assertion name.

## E2E Guidance

- Put browser regressions in `tests/e2e/`.
- Use Playwright for flows like combat, floor transitions, movement reset, or multi-step scene state.
- Load deterministic maps via `?map=<stageId>`.
- Prefer direct scene-state assertions over brittle DOM-only checks.

## Checklist

- Did the mod-facing change add or update at least one automated test?
- If a deterministic stage is needed, was it added to `data/00_core_test/meta.yaml`?
- If a new stage is referenced by `nextStage`, does the target stage exist and is it covered by unit tests?
- If the bug involves real gameplay flow, is there a Playwright regression test?

## Expected Outcome

Mod feature changes should be easy to verify later with `npm test` for unit/contracts and `npm run test:e2e` for browser regressions.