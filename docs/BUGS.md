# Known Bugs & Immediate Fixes Needed

No open bugs at this time.

## Resolved

### BUG-1: Stairs transition (B1F → B2F) not working ✓
- Fixed in commit `a895df9` — added `nextStage: gw_b2f` to B1F `stage.yaml`

### BUG-2: "undefined enemies" in combat message ✓
- Fixed in commit `a895df9` — guarded combat-start log with `alerted?.size ?? combatGroup.length`

### BUG-3: Flee zone overlay not visible ✓
- Fixed in commit `a895df9` — restored flee zone to full alpha (was dimmed to 0.6)
