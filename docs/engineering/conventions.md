---
tags: [myworld, engineering, conventions]
---

# Conventions

Naming, globals, and style rules. For broader codebase orientation see [`/CLAUDE.md`](../../CLAUDE.md).

## Naming

- **Methods**: camelCase (`updateFogOfWar`, `computeVisibleTiles`)
- **Constants**: UPPER_SNAKE_CASE (`FOG_RULES`, `COMBAT_RULES`)
- **Module files**: kebab-case (`fog-system.js`)
- **Module objects**: PascalCase (`GameSceneFogSystem`)
- **Private methods**: underscore prefix (`_helperMethod`)

## Frequently used globals

```javascript
ROWS, COLS, S        // Grid dimensions and tile size
MODE                 // { EXPLORE, COMBAT }
FOG_RULES            // Fog of war settings
COMBAT_RULES         // Combat mechanics
LIGHT_RULES          // Lighting and visibility
WEAPON_DEFS          // Weapon definitions
dnd                  // Dice rolling and D&D calculations
hasLOS(sx,sy,tx,ty)  // Line of sight check
window.rng.map       // Map-generation RNG stream (use this in generators, not Math.random)
```

## Code style rules

1. **Don't mix concerns** — game logic stays out of UI files; UI stays out of system files.
2. **No bundler / no build step** — vanilla JS loaded via `<script>` tags in `index.html`. When adding a new module, add the script tag (after `game.js`, before UI scripts).
3. **Always check bounds** before array access: `tx >= 0 && tx < COLS && ty >= 0 && ty < ROWS`.
4. **Null out Phaser refs after destroy** and guard subsequent access with `.active` — this was the root cause of post-kill freeze bugs.
5. **Map randomness uses `window.rng.map`**, not `Math.random` — keeps map seeds independent of dice/loot rolls.
6. **Default to no comments.** Only add when the *why* is non-obvious (a hidden constraint, subtle invariant, workaround for a specific bug). If removing the comment wouldn't confuse a future reader, don't write it.

## Where to find subsystem references

The "Where things live" section of [`/CLAUDE.md`](../../CLAUDE.md) maps every subsystem directory to its responsibility — start there before grepping. Per-subsystem detail lives in this folder ([engineering/](README.md)).
