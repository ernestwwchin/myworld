# CLAUDE.md — AI Assistant Guide for myworld

## Project Overview

**myworld** is a browser-based tactical RPG prototype built with Phaser 3 and vanilla JS, featuring turn-based grid combat inspired by Baldur's Gate 3. Gameplay rules and content are fully data-driven via YAML files, making the engine portable across web, Electron, and mobile (Capacitor/Steam) targets.

## Quick Start

```bash
npm install          # Install Express + js-yaml
npm start            # Serve at http://localhost:3000
npm test             # Run Node-based test suite
```

Debug modes (set env vars before `npm start`):
- `DEBUG_TOOLS=1` — enables `/_debug/*` endpoints
- `DEBUG_LOG_REQUESTS=1` — logs all HTTP requests
- `DEBUG_TOKEN=<secret>` — protects debug endpoints with a token

## Repository Structure

```
myworld/
├── js/                      # All client-side game logic
│   ├── game.js              # Main Phaser GameScene (~1,955 LOC) — core game loop
│   ├── config.js            # Global constants: TILE, COMBAT_RULES, FOG_RULES, etc.
│   ├── main.js              # Phaser boot/init
│   ├── modloader.js         # YAML mod loading system
│   ├── helpers.js           # BFS pathfinding, LOS, FOV, room topology
│   ├── sprites.js           # Sprite & animation generation
│   ├── autoplay.js          # Auto-play / replay system
│   ├── systems/             # Modular feature systems (see below)
│   ├── ui/                  # DOM/UI helpers (see below)
│   ├── entities/            # Entity class definitions
│   └── utils/common.js      # Shared utility functions
├── data/
│   ├── core/                # Base game rules & content (YAML)
│   │   ├── rules.yaml       # DnD 5e thresholds, tile types, combat/fog/light config
│   │   ├── abilities.yaml   # Ability definitions with hook templates
│   │   ├── creatures.yaml   # Enemy/NPC stat blocks
│   │   ├── classes.yaml     # Character class definitions
│   │   ├── weapons.yaml     # Weapon definitions
│   │   ├── statuses.yaml    # Status effects / conditions
│   │   └── maps.yaml        # Fallback map definitions
│   ├── stages/              # Encounter areas (stage folder pattern)
│   │   ├── test_stage/      # Automated test stages (ts_*)
│   │   └── goblin_warren/   # Example encounter area
│   ├── player.yaml          # Player character definition
│   └── modsettings.yaml     # Active mod configuration
├── tests/
│   └── run-tests.js         # Node VM sandbox test runner
├── docs/
│   └── ai_behavior.md       # AI state machine documentation
├── server.js                # Express server + optional debug endpoints
├── index.html               # Main game page (loads Phaser + js-yaml via CDN)
├── test.html                # Browser test runner page
├── BATTLE_SYSTEM.md         # Combat mechanics reference
└── README.md                # Project overview & quick start
```

## Key Systems

### js/systems/
| File | Responsibility |
|------|---------------|
| `ability-system.js` | Ability/skill execution + BG3-style hook registration |
| `combat-init-system.js` | Initiative calculation + alert propagation |
| `door-system.js` | Door state and interaction |
| `input-system.js` | Player keyboard/click input |
| `initiative-system.js` | Turn order tracking |
| `interactable-system.js` | Interactive object handling |
| `debug-logger.js` | Console logging utilities |

### js/ui/
| File | Responsibility |
|------|---------------|
| `core-ui.js` | Stats panel, dev console (backtick key) |
| `action-buttons.js` | Combat action button rendering |
| `templates.js` | HTML template helpers |

## Architecture & Design Patterns

### Phaser GameScene
`js/game.js` hosts a single Phaser `GameScene`. All game state lives on the scene object. Modular systems are instantiated and attached to the scene in `create()`.

### YAML-Driven Modding
`modloader.js` fetches and parses YAML at runtime. The **stage folder pattern**:
```
data/stages/{areaId}/{stageId}/stage.yaml
```
Falls back to a flat structure if the nested path is not found. Grid symbols in YAML maps (`#`, `.`, `D`, `C`, `S`, `~`, `G`) are converted to numeric tile types defined in `config.js` (TILE constants).

### BG3-Inspired Combat
- **Initiative:** roll + DEX modifier, highest first
- **Engage opener:** move to melee range, resolve attack before formal combat begins
- **Alert propagation:** sight-based, group-based, room-based, side-room via doors
- **Action economy:** 1 Action + 6 Movement tiles per turn
- **Flee gating:** distance + LOS checks
- **Surprise rounds:** target skips their first turn only

### Ability Hook System
Abilities in `data/core/abilities.yaml` use a `template` field with `onHit` and `onDamage` hooks registered at runtime by `ability-system.js`. Follow the existing YAML schema when adding new abilities.

### Pathfinding & Geometry (`js/helpers.js`)
- BFS pathfinding with wall/door blocking
- Bresenham line-of-sight (LOS)
- Angle-based FOV cone checks
- Flood-fill room ID assignment + door connection topology

## Naming & Style Conventions

| Category | Convention | Example |
|----------|-----------|---------|
| JS functions/variables | camelCase | `rollDamage()`, `playerTile` |
| Global constants | UPPER_SNAKE_CASE | `TILE.WALL`, `COMBAT_RULES.AP_PER_TURN` |
| HTML element IDs | kebab-case | `ui-overlay`, `hp-bar`, `action-bar` |
| Helper function prefixes | `is*`, `has*`, `get*`, `do*` | `isInCombat()`, `getAdjacentTiles()` |
| Section separators in JS | ASCII box borders | `// ══════════════...` |

## Data Conventions

### Enemy/NPC Entity Fields
```js
{
  alive: true,
  inCombat: false,
  aiState: 'IDLE',           // IDLE | PATROL | ALERT | COMBAT | SEARCH | RETURN
  lastSeenPlayerTile: null,
  searchTurnsRemaining: 0,
  patrolPath: [],
  homePosition: { x, y }
}
```

### Stage YAML Structure
Each stage defines: `grid` (ASCII map), `playerStart`, and `encounters` (list of creatures with `x`, `y`, `facing`, `group`).

### Ability YAML Schema
Key fields: `id`, `name`, `resourceCost`, `range`, `requiresTarget`, `template` (with `hit`, `damage`, `onHit` hooks).

## Testing

```bash
npm test
```

`tests/run-tests.js` runs in a Node VM sandbox that stubs browser globals and loads `config.js`. Tests validate:
- Dice notation parsing
- Damage rolling
- Feature/mechanic correctness

Browser-based tests (`test.html`) are manual — open in browser and observe results.

**When adding new constants or game logic to `config.js`, add a corresponding test in `run-tests.js`.**

## Adding New Content

### New Creature
Add an entry to `data/core/creatures.yaml` following the existing stat block schema (class, HP, stats, saving throws, features).

### New Ability
Add to `data/core/abilities.yaml` with the full schema. Register any hooks in `js/systems/ability-system.js`.

### New Stage/Encounter
Create `data/stages/{areaId}/{stageId}/stage.yaml`. Reference the goblin_warren or test_stage examples.

### New Game System
Create `js/systems/{feature}-system.js`. Instantiate and attach to the GameScene in `game.js` `create()`. Follow the pattern of existing systems.

## Reference Documentation

| File | Content |
|------|---------|
| `README.md` | Quick start, project structure, debug endpoints |
| `BATTLE_SYSTEM.md` | Full combat mechanics reference |
| `docs/ai_behavior.md` | AI state machine transitions and entity state fields |
| `js/ui/README.md` | UI folder structure guide |

## What NOT to Do

- Do not introduce a build step or bundler without discussion — the project is intentionally zero-build.
- Do not add npm dependencies beyond Express and js-yaml without a strong reason.
- Do not put game logic in UI files (`js/ui/`) or UI manipulation in system files (`js/systems/`).
- Do not hardcode game tuning values in JS — they belong in `data/core/rules.yaml` or `js/config.js` constants.
- Do not break the stage folder fallback pattern in `modloader.js`.
