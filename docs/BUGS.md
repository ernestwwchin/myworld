# Known Bugs & Issues

## Fixed (Archived)
- ~~BUG-1: Stairs transition not working~~ — Fixed: wired in movement-system.js
- ~~BUG-2: "undefined enemies" in combat message~~ — Fixed: enemy name fallback chain
- ~~BUG-3: Flee zone overlay not visible~~ — Fixed: depth/alpha corrected
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
- Added sandbox coverage: `tests/unit/sandbox/modloader-auto-transition.test.js`.
- Added smoke regression: `tests/e2e/run-progression-smoke.spec.js` (portal entry, deterministic auto target resolve, extraction back to town).

### BUG-4: E2E test suite failures
- 23 Playwright e2e tests failing (may be environment/server or test rot)
- Unit tests (21/21) and contract tests all pass
- Need to triage: which failures are real bugs vs stale test expectations

### BUG-5: Loot gold collection in e2e
- `combat-attacks.spec.js` expects `pStats.gold` to increase after enemy defeat
- Floor loot bag spawns but gold routing to player stats may not work correctly
- Related: `floor-item-handler.js`, `inventory-system.js`

### BUG-6: Missing mod data files (404s)
- `data/01_goblin_invasion/items.yaml` — 404 (file doesn't exist)
- Some stage `events.yaml` and `dialogs.yaml` — 404 (referenced but not created)
- Non-blocking (ModLoader handles gracefully) but should be resolved
