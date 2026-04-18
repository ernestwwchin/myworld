---
tags: [myworld, bugs]
status: active
---

# Known Bugs & Issues

## Fixed (Archived)
- ~~BUG-1: Stairs transition not working~~ — Fixed: wired in movement-system.js
- ~~BUG-2: "undefined enemies" in combat message~~ — Fixed: enemy name fallback chain
- ~~BUG-3: Flee zone overlay not visible~~ — Fixed: depth/alpha corrected
- ~~BUG-4: E2E test suite failures (23 tests)~~ — Resolved 2026-04-18: caused by broken local Playwright install (0-byte CLI binary, missing chromium browser). Restored CLI symlink + `npx playwright install chromium`; full suite now 24/24 green.
- ~~BUG-5: Loot gold collection in e2e~~ — Resolved 2026-04-18: `combat-attacks.spec.js` "defeated enemy grants loot-table rewards" now passes once the e2e environment is fixed (no code change required).
- ~~BUG-6: Missing mod data files (404s)~~ — Resolved 2026-04-18: stub `items.yaml`/`events.yaml`/`dialogs.yaml` created for goblin warren stages and test stages that lacked them; fetches no longer 404.
- ~~Kill freeze after defeating enemy~~ — Fixed: null out Phaser refs after destroy, `.active` guards
- ~~Permanent sight line after combat~~ — Fixed: clearSightOverlays on enter/exit combat
- ~~Damage text unreadable in dark areas~~ — Fixed: depth 31 + stroke 5
- ~~Refresh changes to random map~~ — Fixed: seed persistence + boot priority
- ~~Player spawns in wall on floor transition~~ — Fixed: targeted tile persistence

## Active

### Note: run-state scaffold update (2026-04-13)
- Added `runId`, `seed`, `acceptedQuests`, `carried`, `runGold` fields in ModLoader run state.
- Added sandbox coverage: `tests/unit/sandbox/modloader-run-state.test.js`.
- No new runtime regression observed in unit/contracts at merge time.

### Note: deterministic planner + descriptor update (2026-04-13)
- `nextStage:auto` now resolves deterministically from run context (seed/run/world/depth), replacing random picks.
- Depth-band stage descriptors now support object forms (`stageId`/`stage`/`id`/`targetStage`, `stageIndex`, `stageOffset`, `token`, optional `weight`).
- Added sandbox coverage: `tests/unit/sandbox/modloader-auto-transition.test.js` (12 edge-case tests added 2026-04-18 covering stageOffset, out-of-range stageIndex, NaN values, descriptor field priority, self-exclusion, weight clamping, and fallback chains).
- Added smoke regression: `tests/e2e/run-progression-smoke.spec.js` (portal entry, deterministic auto target resolve, extraction back to town).

_No active bugs at present (2026-04-18). Phase 2 work tracked in `ROADMAP.md`._
