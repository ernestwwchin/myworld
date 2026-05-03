# Agentic World Builder

## Concept

An AI agent that generates complete mod stages (stage YAML + events + dialogs) from natural language descriptions. The agent knows the tile catalog, composition rules, and mod schema — it produces valid, playable stage files.

## Priority

**Future** — blocked on:
1. Map generator / tile stamper working (in progress)
2. Game engine consuming mod stage YAML
3. Mod tools (editor, stamp library)

## Architecture

```
User prompt
  "3-room dungeon: entry hall, trapped corridor, boss arena with pillars"
      │
      ▼
┌─────────────────────────────────┐
│      World Builder Agent        │
│                                 │
│  Knowledge:                     │
│  - Tile symbols (#.DCS~GFAIH)  │
│  - Stage YAML schema            │
│  - Encounter format             │
│  - Creature/item registries     │
│  - Composition rules            │
│  - Generator configs (BSP/CA)   │
│                                 │
│  Tools:                         │
│  - File creation (stage.yaml)   │
│  - File creation (events.yaml)  │
│  - File creation (dialogs.yaml) │
│  - Stamp preview (stamp-test)   │
│  - Contract test validation     │
│                                 │
│  Output:                        │
│  - public/data/<mod>/stages/    │
│    └─ <stage_id>/               │
│       ├─ stage.yaml             │
│       ├─ events.yaml            │
│       └─ dialogs.yaml           │
└─────────────────────────────────┘
```

## Agent Rules (draft)

### Grid composition
- Every room must be fully enclosed by walls
- Grid padding: at least 1 row/col of void around outer walls
- Corridors: minimum 2-wide for comfortable movement
- Doors (`D`) only on wall cells connecting two floor regions
- Chests (`C`) on floor cells, not blocking doorways
- Stairs (`S`) at least 2 tiles from any wall
- Player start (`playerStart`) must be on a floor cell

### Stage YAML required fields
- `name`, `floor`, `globalLight`, `grid`, `playerStart`, `nextStage`
- `encounters` if any creatures
- `events: []` and `dialogs: {}` stubs if no content (avoid 404s)

### Encounter rules
- Hand-placed: must have valid `x, y` on floor tiles
- Groups share a `group:` tag for simultaneous aggro
- Creature IDs must exist in loaded creature registries
- Boss encounters: single creature, near center or back of room

### Quality checks
- All `nextStage` references must resolve to a real stage
- Grid rows must be equal length
- No unreachable floor regions (all floors connected)
- Contract tests must pass after generation

## Implementation options

| Approach | Setup | Iteration |
|----------|-------|-----------|
| **VS Code Agent** (`.agent.md`) | Agent file + tile catalog in instructions | Chat → generate → test |
| **Prompt file** (`.prompt.md`) | Reusable prompt template | Copy-paste to any LLM |
| **In-browser** | Text input → LLM API → live render | Type → see → refine |

## Stage YAML quick reference

```yaml
name: "The Goblin Den"
floor: B1F
globalLight: dim
nextStage: auto

grid:
  - "##########"
  - "#........#"
  - "#..##..D.#"
  - "#..##..#.#"
  - "#......#.#"
  - "#.C....S.#"
  - "##########"

playerStart: { x: 1, y: 1 }

encounters:
  - { creature: goblin, x: 6, y: 2, facing: 180 }
  - { creature: goblin, x: 7, y: 4, facing: 270, group: den_guards }
  - { creature: goblin_captain, x: 7, y: 5, facing: 270, group: den_guards }
```

### Tile symbols
| Char | Type | Notes |
|------|------|-------|
| `#` | WALL | Autotiled by renderer |
| `.` | FLOOR | Walkable ground |
| `D` | DOOR | Must be on wall between floor regions |
| `C` | CHEST | On floor, not blocking paths |
| `S` | STAIRS | Stage exit point |
| `~` | WATER | Impassable/hazard |
| `G` | GRASS | Decorative floor variant |
| `F` | FIRE | Hazard |
| `A` | ACID | Hazard |
| `I` | ICE | Slippery floor |
| `H` | CONSECRATED | Holy ground |

### Generator alternative
```yaml
generator:
  type: bsp
  cols: 56
  rows: 36
  depth: 2
  stairs: true
  doors: true
  chests: 3

encounters:
  - squad: patrol
    creatures: [goblin, goblin]
    count: 3
    placement: corridor
```
