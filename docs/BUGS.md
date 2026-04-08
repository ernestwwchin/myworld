# Known Bugs & Immediate Fixes Needed

## Priority: Fix Next

### BUG-1: Stairs transition (B1F → B2F) not working
- Step on STAIRS tile → should transition to the next stage
- Stage transition system exists (`changeStage` / `nextFloor`) but stairs interaction is not wired
- Likely in: `js/systems/movement-system.js` or `js/systems/entity-system.js`
- Related stage data: `data/01_goblin_invasion/stages/gw_b2f/stage.yaml` exists

### BUG-2: "undefined enemies" in combat message
- When combat starts, the log reads "undefined enemies" instead of enemy names/count
- Likely in: `js/modes/mode-combat.js` — the combat entry message formatter
- Fix: guard `enemy.name` / `enemy.id` fallback before building the combat message

### BUG-3: Flee zone overlay not visible
- The flee zone highlight (teal/blue overlay) should appear when player selects flee
- Overlay was previously confirmed rendered but depth or alpha may be wrong
- Flee zone depth was set to 16; verify against `docs/depth-layers.md`
- Likely in: `js/modes/mode-combat.js` flee zone drawing code
