# Skills: Project Core

Project context, conventions, and file structure. **Always relevant** when working on this codebase.

## Project Context

Phaser 3 tactical RPG inspired by Baldur's Gate 3, using D&D 5e rules.
- Zero-build architecture (no bundler)
- Modular JavaScript with prototype-based mixins
- YAML-driven data and modding
- Node.js/Express server (no new npm deps beyond Express + js-yaml)

## Naming Conventions

- **Methods**: camelCase (`updateFogOfWar`, `computeVisibleTiles`)
- **Constants**: UPPER_SNAKE_CASE (`FOG_RULES`, `COMBAT_RULES`)
- **Module files**: kebab-case (`fog-system.js`)
- **Module objects**: PascalCase (`GameSceneFogSystem`)
- **Private methods**: underscore prefix (`_helperMethod`)

## Frequently Used Globals

```javascript
ROWS, COLS, S        // Grid dimensions and tile size
MODE                 // { EXPLORE, COMBAT, EXPLORE_TB }
FOG_RULES            // Fog of war settings
COMBAT_RULES         // Combat mechanics
LIGHT_RULES          // Lighting and visibility
WEAPON_DEFS          // Weapon definitions
dnd                  // Dice rolling and D&D calculations
hasLOS(sx,sy,tx,ty)  // Line of sight check
```

## File Structure

```
js/
├── game.js              # Main GameScene (being modularized)
├── config.js            # Constants, dnd helper, rules
├── autoplay.js          # Integration test scenarios
├── systems/             # Extracted game systems
│   ├── fog-system.js
│   ├── sight-system.js
│   ├── explore-tb-system.js
│   ├── ability-system.js
│   └── combat-init-system.js
├── ui/
│   └── core-ui.js       # UI components
data/
├── core/                # weapons.yaml, creatures.yaml, etc.
├── player.yaml
docs/
├── ref/                 # D&D 5e reference docs
├── skills/              # AI skills documentation (this folder)
├── modding_guide.md
tests/
├── run-tests.js         # Main test runner
└── test-*.js            # Individual test files
```

## Quick Commands

```bash
node tests/run-tests.js      # Run all tests
npm start                     # Start dev server
node tests/test-fog-system.js # Run specific test
```

## Code Style Rules

1. Don't put game logic in UI files or UI in system files
2. No bundler/build step — vanilla JS loaded via `<script>` tags
3. Always check bounds before array access
4. Update `index.html` script tags when adding new modules
