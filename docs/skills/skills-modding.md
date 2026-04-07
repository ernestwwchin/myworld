# Skills: Modding & Data

YAML data structures and modding API patterns. Load when working on game data or mod support.

## YAML Data Patterns

### Weapons
```yaml
weapons:
  longsword:
    name: "Longsword"
    damageDice: "1d8+3"
    range: 5
    properties: ["versatile"]
    cost: "15 gp"
    weight: 3
```

### Creatures
```yaml
creatures:
  goblin:
    name: "Goblin"
    hp: 7
    ac: 15
    stats: "8/14/10/10/8/8"     # STR/DEX/CON/INT/WIS/CHA shorthand
    attack:
      weaponId: shortsword
    sight: 6
    cr: 0.25
```

### Player
```yaml
player:
  name: "Adventurer"
  class: fighter
  level: 1
  stats: "15/14/13/10/12/8"
  equipment:
    weaponId: longsword
    armorId: chain_mail
```

## Modding API Tiers

| Tier | Description | Example |
|------|-------------|---------|
| **Data** | Add/override YAML content | New weapons, monsters |
| **Tuning** | Adjust balance numbers | Damage formulas, encounter rates |
| **Hook** | Extend via event system | Custom triggers, effects |
| **Script** | Full JS access via `mod.*` API | New mechanics, UI |

## Modding Constraints

- Mods use a locked-down `mod.*` helper object, **not** raw scene access
- No new npm dependencies allowed beyond Express + js-yaml
- YAML shorthand formats:
  - **Dice**: `"1d8+3"`, `"2d6+1d4+2"`
  - **Stats**: `"8/14/10/10/8/8"` (STR/DEX/CON/INT/WIS/CHA)
  - **Cost**: `"15 gp"`, `"100 gp"`

## Data File Locations

```
data/
├── 00_core/              # Base game data
│   ├── meta.yaml
│   ├── rules.yaml
│   ├── weapons.yaml
│   ├── creatures.yaml
│   ├── abilities.yaml
│   └── statuses.yaml
├── 01_goblin_invasion/   # Content mod
│   ├── meta.yaml         # includes, stages, flags
│   ├── creatures.yaml
│   └── stages/
│       └── gw_b1f/
│           ├── stage.yaml
│           ├── events.yaml
│           └── dialogs.yaml
├── 00_core_test/         # Test mod (disabled by default)
│   ├── meta.yaml
│   └── stages/ts_*/
│       ├── stage.yaml
│       └── events.yaml   # autoplay: steps for browser tests
└── player.yaml
```

## Loading Data in Code

```javascript
// Server-side (Node.js)
const yaml = require('js-yaml');
const data = yaml.load(fs.readFileSync('data/core/weapons.yaml', 'utf8'));

// Client-side (fetched via Express routes)
const weapons = await fetch('/api/data/weapons').then(r => r.json());
```

## Event System (3 files)

| System | File | Role |
|--------|------|------|
| **Flags** | `js/systems/flags.js` | Namespaced state store (bool/counter/enum) |
| **EventRunner** | `js/systems/event-runner.js` | Step executor + tile/named triggers |
| **DialogRunner** | `js/systems/dialog-runner.js` | Conversation trees with choices + skill checks |

### events.yaml keys
- `events:` — triggered events (tile, combatEnd, flag change)
- `autoplay:` — test-only step sequences (run by autoplay.js)
- Steps use `{ do: action, ...params }` format
- Conditions: `{ flag: key }`, `{ mode: combat }`, `{ all/any/not: [...] }`

### dialogs.yaml keys
- `dialogs:` — map of node IDs → `{ speaker, text, choices, actions, next }`
- Choices can have `check: { skill, dc }` with `pass`/`fail` branches
- Choices can have `if:` condition gates

### Flags in meta.yaml
```yaml
flags:
  boss_dead: { type: bool, default: false }
  kills: { type: counter, default: 0 }
  quest: { type: enum, values: [not_started, active, complete], default: not_started }
```

## Reference

- `docs/modding_guide.md` — Full modding guide with event system, hooks, actions table
- `docs/ref/` — D&D 5e content reference for data authoring
