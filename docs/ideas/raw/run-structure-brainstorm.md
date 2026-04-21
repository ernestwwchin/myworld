# Run Structure & Map Generation Brainstorm

Status: raw
Date: 2026-04-21
Source: design discussion

---

## Core Decisions

- **D2-style zone structure** — linear main zones + branching side dungeons
- **Zone transitions** — brief fade (0.5s), same mechanism for all transitions
- **Forward-only** — no returning to town mid-run (one-way ticket)
- **Waypoints** — fast travel between activated waypoints within the world only
- **Branching paths** — player chooses route at branch points (different zones, enemies, rewards)
- **Solo player** + summon system (no party)
- **Persistent town** — hand-crafted safe zone with NPCs, upgrades, stash
- **World seed** — all generation from worldSeed, deterministic per run

---

## Story: The Gate

A magical Gate appeared near a small village. Monsters come through it. Each World is a realm beyond the Gate.

- **Town** exists on the safe side
- **Player** goes through the Gate to push enemies back
- **Each world** = a different realm (goblin forest, undead crypt, jungle, mountain, corrupted source)
- **Boss kills** weaken the Gate's pull on that realm → next realm becomes accessible
- **Death** = the Gate pulls you back when you fall
- **Waypoints** = magical anchors planted in hostile territory
- **Challenge maps** = unstable pocket dimensions branching off the main realm

---

## Run Flow

```
TOWN (preparation):
  1. Check gear — equip best weapon/armor
  2. Buy consumables — potions, scrolls, throwables (spend gold wisely)
  3. Check inventory — 10+STR slots, every slot counts
  4. Enter World Portal → POINT OF NO RETURN

WORLD (the run):
  5. Explore zones forward (Zone 1 → branch → converge → boss)
  6. At each zone:
     - Fight enemies, open chests, discover events
     - Find and activate waypoint
     - Deposit valuable loot at stash box (deposit only)
     - Enter side dungeons (optional)
     - Short rest at waypoint (heal 50%, once per waypoint)
  7. Waypoint between activated waypoints within world
  8. Reach boss → fight

EXIT CONDITIONS:
  9a. Beat boss → return to town with everything, world complete
  9b. Die → respawn in town, lose carried items + gold %, zones respawn
  9c. Extract at waypoint → keep loot, run ends, must restart world
```

---

## Town

**Persistent zone** — hand-crafted ~30×30, no enemies. Grows visually as player invests.

| NPC / Feature | Service |
|---|---|
| **Stash Chest** | Deposit / withdraw items (persistent) |
| **Blacksmith** | Refine ★, sell Chisels/Hammers |
| **Alchemist** | Potion upgrades (stack+, blade coating, brewing) |
| **Scribe** | Scroll upgrades (stack+, conservation, copy) |
| **Armorer** | Throwable upgrades (stack+, range+, craft) |
| **Quest Board** | Available quests, side dungeon info |
| **World Portal** | Enter a world (point of no return) |

---

## World 1: Goblin Invasion — Zone Map

```
                    TOWN
                      │
                      ▼
               Zone 1: Greenwood Path (140×100, CA)
              ╱        │          ╲
        [Mine]    [Cellar]     continue
       (normal)   (challenge)
                      │
                      ▼
                 BRANCH POINT
                ╱            ╲
    Zone 2A: Goblin         Zone 2B: Dark
    Outpost (110×80)        Hollow (110×80)
    ├── [Grotto]            ├── [Cursed Shrine]
    │   (challenge)         │   (challenge)
    ▼                       ▼
    Zone 3A: Warren      Zone 3B: Bone
    Entrance (90×70)     Tunnels (90×70)
    ├── [Prison]         ├── [Crypt]
    │   (normal)         │   (normal)
     ╲                     ╱
      ╲                   ╱
       ▼               ▼
      Zone 4: Deep Warren (90×70)
              │
              ▼
      Zone 5: Warlord's Throne (50×40, fixed)
```

**5 main zones per run** (1 start + 2 branch + 1 converge + 1 boss), **4 side dungeons accessible** (2 from Greenwood + 2 from chosen branch).

---

## Zone Details

| Zone | Generator | Size | Biomes | Enemies | Encounters |
|---|---|---|---|---|---|
| Greenwood Path | CA + Perlin | 140×100 | Forest + ruined settlement | Goblins, wolves, spiders | 4-6 groups |
| Goblin Outpost | CA + BSP | 110×80 | Open field + wooden fortress | Goblin archers, scouts, shaman | 5-7 groups |
| Dark Hollow | CA (high fill%) | 110×80 | Dead forest | Shadow beasts, undead scouts | 5-7 groups |
| Warren Entrance | BSP + CA hybrid | 90×70 | Stone dungeon + prison + mine cave | Goblin warriors, trappers, spiders | 5-7 groups |
| Bone Tunnels | BSP + CA | 90×70 | Crypt + collapsed tunnels | Undead, skeleton warriors | 5-7 groups |
| Deep Warren | BSP + CA | 90×70 | Goblin tunnels + corrupted cavern | Elite goblins, cave beasts | 6-8 groups |
| Warlord's Throne | Fixed | 50×40 | Boss arena | Goblin Warlord + 4 guards | 1 boss fight |

### Greenwood — Multi-Area Layout

| Area | Content |
|---|---|
| Entrance clearing | Waypoint, safe start, 1-2 weak goblins |
| Wolf Den (NW pocket) | Wolf pack (3-4), hidden chest |
| Crossroads (center) | Main path hub, 2-3 goblin scouts |
| Cave Mouth (SW) | Side dungeon entrance → Abandoned Mine |
| Shrine (NE) | Event: blessing or cursed shrine (random) |
| Ancient Ruins (SE) | Side dungeon entrance → Forgotten Cellar |
| Exit path (N) | Guarded by tougher goblins, leads to branch point |

### Difficulty Ramp

| Zone | Expected Level | Enemy AC | Enemy HP | Enemy Damage |
|---|---|---|---|---|
| Greenwood | 1 | 12-13 | 7-12 | 1d6 |
| Outpost / Hollow | 1 | 13-14 | 10-18 | 1d6+1 |
| Warren / Tunnels | 1-2 | 14 | 15-25 | 1d8 |
| Deep Warren | 2 | 14-15 | 20-35 | 1d8+2 |
| Throne (boss) | 2 | 16 | 50 | 2d6 |

---

## Waypoints

| Waypoint Action | Effect |
|---|---|
| **Fast travel** | TP to any other activated waypoint in this world |
| **Stash (deposit only)** | Bank items safely — survives death |
| **Short rest** | Heal 50% HP, once per waypoint per run |
| **Extract** | End run, return to town with all carried items. Must restart world. |

**No waypoint-to-town TP.** Forward-only within the world.

---

## Side Dungeons

### Type 1: Normal Side Quest

- Enter with current level, gear, inventory
- Can leave and re-enter freely (progress resets on re-enter)
- Death = full run death (same as dying in main world)
- Enemies scaled to expected level (shown at entrance)

### Type 2: Challenge Map (Shiren-style)

- Reset to level 1, empty inventory — gear/state frozen
- Seed = hash(worldSeed, dungeonId, attemptNumber) — different layout each try
- Cannot leave mid-run (forfeit = same as die inside)
- On clear: reward sent to stash, restore frozen state, back to zone
- On die: lose everything found inside, restore frozen state, back to zone, **no penalty**
- Can retry unlimited times per run

### Entrance UI

```
┌─────────────────────────────┐
│  Abandoned Mine             │
│  Type: Side Quest           │
│  Difficulty: ★★☆☆☆         │
│  Expected Level: 2-3        │
│  [Enter]  [Cancel]          │
└─────────────────────────────┘

┌─────────────────────────────┐
│  Forgotten Cellar           │
│  Type: Challenge            │
│  Difficulty: ★★★★☆         │
│  "Enter at Level 1, naked"  │
│  Attempt: #3                │
│  [Enter]  [Cancel]          │
└─────────────────────────────┘
```

### Side Dungeons Per Branch

| Greenwood (shared) | Path A (Goblin route) | Path B (Dark route) |
|---|---|---|
| Abandoned Mine (normal, 3 floors) | Mushroom Grotto (challenge, 4 floors) | Cursed Shrine (challenge, 3 floors) |
| Forgotten Cellar (challenge, 3 floors) | Prison Cells (normal, 3 floors) | Crypt (normal, 3 floors) |

---

## Cleared State & Persistence

| What | Persists within run? | Persists across death? |
|---|---|---|
| Killed enemies | Yes (stay dead) | No (respawn on new run) |
| Opened chests | Yes (stay empty) | No |
| Activated waypoints | Yes | No |
| Deposited stash items | Yes | **Yes** (stash is permanent) |
| Objective flags | Yes | No |
| Side dungeon completion | Yes | No |
| Same seed | Yes (until boss beaten) | Yes (same seed until clear) |

---

## Map Generation Pipeline

### Phase 1: World Generation (on first entry)

```
Input: saveId, worldId, runId

worldSeed = hash(saveId, worldId, runId)

For each zone in world definition:
  zoneSeed = hash(worldSeed, zoneId)
  modifierSeed = hash(worldSeed, zoneId, "modifier")
  
  Pick environmental modifier (0-1) from weighted pool
  Pick objective modifier (0-1) from weighted pool
  Pick zone events (shrine type, NPC, etc.)
  
Store in runState → worldPlan
```

### Phase 2: Zone Generation (on entering a zone)

```
Step 1:  BASE GRID — run generator(s) with zoneSeed
Step 2:  THEME TILES — replace WALL/FLOOR with biome variants
Step 3:  STRUCTURAL PLACEMENT — entrance, exit, waypoint, stash, side entrances
Step 4:  APPLY ENVIRONMENTAL MODIFIER — flood, dark, cave-in, etc.
Step 5:  APPLY OBJECTIVE MODIFIER — sealed exit, keystones, drain levers
Step 6:  PLACE ENEMIES — encounter groups per biome region
Step 7:  PLACE LOOT — chests, floor items per loot table
Step 8:  PLACE EVENTS — shrines, NPCs, traps, surprise encounters
Step 9:  ROOM DECORATION — furniture templates per room type
Step 10: LIGHTING + FOG — torches, ambient light, fog of war init
```

### Phase 3: Zone State Persistence

On re-enter same zone: regenerate from same seed, apply cleared state (remove killed enemies, mark opened chests).

### Phase 4: Side Dungeon Generation

- Normal: same as Phase 2, per-floor seed = hash(dungeonSeed, floorIndex)
- Challenge: seed = hash(dungeonSeed, attemptNumber), player state frozen/restored

---

## Generators

### BSP (Binary Space Partition) — built

**What it does:** Recursively splits rectangular space into leaves. Carves a room inside each leaf. Connects rooms with L-shaped corridors. Places doors at chokepoints, chests in dead-end rooms.

**Output:** Rectangular rooms, corridors, doors, chests, torches.

**Config:**

```yaml
generator:
  type: bsp
  cols: 90
  rows: 70
  minLeaf: 8          # minimum leaf size before stop splitting
  maxLeaf: 18         # maximum leaf size (force split if exceeded)
  minRoomSize: 4      # minimum room width/height
  roomPad: 1          # padding between room edge and leaf edge
  doors: true         # place doors at corridor chokepoints
  chests: 3           # number of chests to place
  torches: 10         # number of wall torches
  stairs: true        # place exit stairs in farthest room
```

**Best for:** Indoor dungeons, forts, prisons, crypts, libraries, temples.

**Modding notes:**
- `minLeaf` / `maxLeaf` controls room density — smaller = more rooms, tighter corridors
- `minRoomSize: 3` creates tiny cells (prison). `minRoomSize: 8` creates large halls
- `roomPad: 3` creates wide open space between rooms (outpost feel)
- Currently connects rooms via minimum spanning tree (one path). Extra loops would add alternate routes.

---

### Cellular Automata (CA) — built

**What it does:** Fills grid randomly (wall/floor), then runs smoothing steps. Adjacent wall count determines if a tile becomes wall or floor. Keeps largest connected region. Result: organic, cave-like spaces.

**Output:** Irregular open caverns connected by organic passages.

**Config:**

```yaml
generator:
  type: cellular_automata
  cols: 120
  rows: 90
  fillPct: 48         # initial wall percentage (higher = more walls, tighter caves)
  steps: 5            # smoothing iterations (more = smoother, fewer = rougher)
  torches: 8
  stairs: true
```

**Best for:** Natural caves, forests, swamps, mushroom caverns, any organic environment.

**Modding notes:**
- `fillPct: 40` = very open, large caverns. `fillPct: 55` = tight, winding tunnels.
- `steps: 3` = rough, jagged walls. `steps: 7` = smooth, rounded caves.
- Does NOT guarantee a single connected path from entrance to exit — `keepLargestRegion` helps but a guaranteed path post-process is needed.
- Player starts near center, stairs placed at farthest floor tile.

---

### Drunkard's Walk — needs building

**What it does:** Starts at a point, walks in random directions carving floor tiles. Creates winding, irregular tunnels. Can run multiple "walkers" for branching paths.

**Output:** Narrow winding tunnels with occasional wider areas where paths cross.

**Config:**

```yaml
generator:
  type: drunkard_walk
  cols: 60
  rows: 50
  walkers: 3           # number of independent walkers
  steps_per_walker: 400 # how many tiles each walker carves
  widen_chance: 0.1     # chance to carve 3-wide instead of 1-wide
  branch_chance: 0.05   # chance to spawn a new walker mid-path
  start: center         # or edge, random
```

**Algorithm:**
1. Place walker at start position
2. Each step: pick random direction (N/S/E/W), move, carve floor tile
3. Repeat for N steps
4. Optional: chance to widen carve (3-tile wide) or spawn branch walker
5. Multiple walkers create branching tunnel networks

**Best for:** Mine shafts, worm tunnels, sewer pipes, root networks, narrow escape routes.

**Modding notes:**
- Low `walkers` + high `steps_per_walker` = one long winding path
- High `walkers` + low `steps_per_walker` = many short branches
- `widen_chance: 0.3` creates occasional caverns along the tunnel
- Good base for mine biomes — stamp rail prefabs along the carved path

---

### Perlin Noise Overlay — needs building

**What it does:** Generates smooth gradient values across the grid. NOT a standalone generator — used as an overlay on BSP/CA output to add natural terrain variation.

**Output:** Per-tile float value (0.0–1.0) that drives tile replacement, feature density, and elevation.

**Config:**

```yaml
overlay:
  type: perlin_noise
  scale: 0.05          # noise frequency (lower = larger blobs, higher = finer grain)
  octaves: 3           # detail layers (more = more complex terrain)
  thresholds:
    - { below: 0.25, tile: DEEP_WATER }
    - { below: 0.35, tile: SHALLOW_WATER }
    - { below: 0.50, tile: MUD }
    - { above: 0.75, tile: DENSE_TREE }
    - { above: 0.90, tile: ROCK }
```

**Algorithm:**
1. Generate 2D Perlin noise array (cols × rows) from seed
2. For each tile: if base tile is FLOOR, check noise value against thresholds
3. Replace tile based on threshold rules
4. Result: smooth, natural-looking terrain gradients

**Best for:** Water placement (rivers, pools), vegetation density (sparse → dense forest), elevation hints, swamp/bog zones, desert dunes, snow coverage.

**Modding notes:**
- `scale: 0.02` = huge zones (continent-scale blobs). `scale: 0.1` = small patches.
- Stack multiple noise layers with different scales for complex terrain.
- Never replaces WALL tiles — only modifies FLOOR variants.
- Combine with CA: CA creates the cave shape, Perlin adds water/moss/crystal distribution inside.

---

### Prefab Stamping — needs building

**What it does:** Places hand-crafted tile patterns (prefabs) at specific locations on a generated map. The base map is generated normally, then prefabs overwrite selected areas.

**Output:** Mix of generated + hand-designed content.

**Config:**

```yaml
prefabs:
  - id: waypoint_plaza
    size: { w: 7, h: 7 }
    placement: near_entrance    # or: room_largest, room_deadend, center, coordinates
    grid: |
      WWWWWWW
      W.....W
      W..P..W      # P = waypoint tile
      W.....W
      W..S..W      # S = stash box
      W.....W
      WW.D.WW      # D = door, . = floor, W = wall
    
  - id: altar_room
    size: { w: 9, h: 7 }
    placement: room_deadend
    grid: |
      WWWWWWWWW
      W.......W
      W..c.c..W    # c = candle (sprite + light)
      W...A...W    # A = altar (interactive)
      W..c.c..W
      W.......W
      WWWW.WWWW
    entities:
      A: { type: interactable, template: shrine_altar }
      c: { type: sprite, sprite: candle, light: { radius: 2 } }
      
  - id: shop_camp
    size: { w: 11, h: 9 }
    placement: room_large
    chance: 0.15              # 15% chance to appear per zone
    grid: |
      WWWWWWWWWWW
      W.........W
      W..T.T.T..W    # T = table (blocking furniture)
      W.........W
      W....M....W    # M = merchant NPC
      W.........W
      W..B...B..W    # B = barrel/crate (searchable)
      W.........W
      WWWWW.WWWWW
    entities:
      M: { type: npc, template: traveling_merchant }
      T: { type: furniture, tile: FURNITURE_TABLE }
      B: { type: interactive, template: supply_crate, loot_table: merchant_scraps }
```

**Algorithm:**
1. Generate base map (BSP/CA/etc.)
2. For each prefab in zone config:
   a. Find placement position (near entrance, in largest room, at dead end, etc.)
   b. Check if prefab fits (no overlap with other prefabs)
   c. Stamp prefab grid onto base grid (overwrite tiles)
   d. Create entities defined in prefab
3. Re-run connectivity check (ensure prefab didn't block the only path)

**Best for:** Shops, altars, boss arenas, waypoint plazas, NPC camps, puzzle rooms, set pieces.

**Modding notes:**
- Prefabs are defined in YAML — modders can create custom set pieces
- `placement` options: `near_entrance`, `near_exit`, `room_largest`, `room_deadend`, `room_random`, `center`, `{x, y}` coordinates
- `chance` makes prefabs optional — not every run has a shop
- Prefab can define entities inline — they're created when stamped
- Multiple prefabs per zone — each finds its own placement

---

### Maze (Prim's Algorithm) — needs building

**What it does:** Generates a perfect maze — every cell is reachable, exactly one path between any two points. Dense corridors with many dead ends.

**Output:** Tight labyrinth with corridors 1-tile wide, walls 1-tile thick.

**Config:**

```yaml
generator:
  type: maze
  cols: 60
  rows: 50
  loop_chance: 0.05     # chance to carve extra connections (makes it imperfect, less frustrating)
  room_chance: 0.10     # chance to expand a cell into a small room (3×3)
  dead_end_fill: 0.2    # fill 20% of dead ends back to wall (shortens dead ends)
```

**Algorithm:**
1. Start with all walls
2. Pick a random cell, mark visited
3. From visited cells, find unvisited neighbors (through wall)
4. Pick random neighbor, carve wall between them, mark visited
5. Repeat until all cells visited
6. Post-process: carve loops (extra connections), expand some cells to rooms, fill some dead ends

**Best for:** Labyrinth zones, hedge mazes, goblin trap networks, spider web tunnels, puzzle dungeons.

**Modding notes:**
- `loop_chance: 0` = perfect maze (frustrating, only one path). `loop_chance: 0.15` = multiple routes.
- `room_chance: 0.2` = scattered rooms in the maze (rest points, loot rooms, enemy dens).
- Pure mazes can be disorienting — combine with torch placement and a "breadcrumb" mechanic.
- Best used for side dungeons or single biome sections, not full zones.

---

### L-System / Branching — nice to have

**What it does:** Grows tree-like branching structures from a root point. Uses L-System grammar rules to expand branches.

**Output:** Branching tunnel networks that look like root systems, river deltas, or vein networks.

**Config:**

```yaml
generator:
  type: lsystem
  cols: 80
  rows: 60
  axiom: "F"                     # starting symbol
  rules:
    F: "F[+F]F[-F]F"            # branching rule
  angle: 25                      # branch angle in degrees
  iterations: 4                  # how many times to expand rules
  segment_length: 5              # tiles per F segment
  width: { start: 3, end: 1 }   # tunnel starts wide, branches narrow
```

**Best for:** Root networks (treant lair), river/water systems, vein networks (corrupted zone), anthill tunnels.

**Modding notes:**
- Different `rules` grammars create wildly different structures
- `iterations: 3` = simple. `iterations: 6` = extremely dense branching.
- Width tapering (wide trunk → narrow branches) creates natural root feel
- Good for biome overlays — generate branches, then carve them into a CA base

---

## Hybrid Generator: Multi-Biome Zones

A single zone can use **different generators per region**.

```
Step 1: Split grid by biome regions
  ┌──────────────────────┐
  │  UPPER: 90×30        │  ← BSP region (dungeon)
  ├──────────────────────┤  ← border (transition)
  │  LOWER: 90×38        │  ← CA region (cave/mine)
  └──────────────────────┘

Step 2: Run generator per region
  Upper → BSP(90×30, theme: stone_dungeon)
  Lower → CA(90×38, theme: cave_mine)

Step 3: Connect at border
  Find closest rooms across border, carve stairs/ramp

Step 4: Merge into single grid
```

### YAML Config

```yaml
zone:
  id: warren_entrance
  cols: 90
  rows: 70
  
  biomes:
    - id: dungeon
      region: { y: 0.0, h: 0.42 }
      generator: bsp
      generator_config:
        minLeaf: 8
        maxLeaf: 18
        doors: true
        chests: 2
      theme: stone_dungeon
      enemies: [goblin_warrior, goblin_trapper]
      
    - id: prison
      region: { x: 0.6, w: 0.4, y: 0.0, h: 0.42 }
      generator: bsp
      generator_config:
        minLeaf: 5
        maxLeaf: 10
        minRoomSize: 3
        doors: true
      theme: prison
      enemies: [goblin_jailer]
      
    - id: mine
      region: { y: 0.55, h: 0.45 }
      generator: cellular_automata
      generator_config:
        fillPct: 45
        steps: 5
      theme: cave_mine
      tile_extras:
        RAIL: { chance: 0.03 }
        WATER: { chance: 0.08 }
      enemies: [cave_spider, mining_goblin]

  connections:
    - from: dungeon
      to: mine
      type: stairs_down
    - from: dungeon
      to: prison
      type: iron_gate
```

---

## Room Decoration (Templates)

After generators create rooms, each room gets a **room type** based on biome + size + seed. Room types define furniture placement.

### Room Types

| Room Type | Min Size | Biomes | Furniture |
|---|---|---|---|
| `empty` | Any | Any | Nothing |
| `barracks` | 7×6 | Dungeon, Fort | Beds, table, chairs, torches |
| `mess_hall` | 9×7 | Dungeon, Fort | Long tables, benches, food crate |
| `armory` | 6×6 | Dungeon, Fort | Weapon racks, armor stands, chest |
| `storage` | 4×4 | Any indoor | Crates, barrels, shelves |
| `cell` | 3×3 | Prison | Bed, bucket, iron door |
| `temple_altar` | 8×7 | Temple, Crypt | Altar, candles, bookshelves, carpet |
| `library` | 8×7 | Temple, Dungeon | Bookshelves (walls), table, candle |
| `throne_room` | 12×10 | Boss area | Throne, carpet, braziers, banners |
| `camp_tent` | 6×5 | Forest, Outdoor | Bedroll, campfire, supply crate |
| `mine_shaft` | 10×4 | Mine | Rails, minecart, support beams |
| `mushroom_grove` | 8×8 | Cave | Giant mushrooms, spore clouds, pool |
| `crypt_chamber` | 6×6 | Crypt | Sarcophagus, bone piles, cobwebs |
| `workshop` | 7×6 | Dungeon, Fort | Anvil, forge, workbench |

### Furniture Types

| Type | Grid effect | Player interaction |
|---|---|---|
| Blocking tile (table, altar, sarcophagus) | Blocks movement | Walk around |
| Decorative sprite (candle, banner, cobweb) | Visual only | None or inspect (flavor text) |
| Interactive object (chest, bookshelf, weapon rack) | May block | Search/loot, use, break |
| Light source (torch, brazier, candle) | Visual + light radius | Provides visibility |

### Template YAML Example

```yaml
room_templates:
  barracks:
    min_size: { w: 7, h: 6 }
    biomes: [stone_dungeon, wooden_fort]
    weight: 15
    furniture:
      - type: bed
        position: { wall: left, repeat: 3, spacing: 2 }
        tile: FURNITURE_BED
      - type: table
        position: { center: true, offset_y: -1 }
        tile: FURNITURE_TABLE
        size: { w: 2, h: 1 }
      - type: chair
        position: { adjacent_to: table, side: south }
        sprite: chair
        count: 2
      - type: torch
        position: { wall: south, count: 2 }
        light: { radius: 3, level: dim }
        
  temple_altar:
    min_size: { w: 8, h: 7 }
    biomes: [stone_dungeon, crypt, temple]
    weight: 5
    furniture:
      - type: altar
        position: { center: true }
        tile: FURNITURE_ALTAR
        interactive: true
        actions:
          - label: "Pray"
            event: shrine_prayer
      - type: bookshelf
        position: { wall: [east, west], count: 3 }
        tile: FURNITURE_SHELF
        interactive: true
        actions:
          - label: "Search"
            loot_table: bookshelf_loot
      - type: candle
        position: { around: altar, distance: 1, count: 4 }
        sprite: candle
        light: { radius: 2, level: dim }
      - type: carpet
        position: { from: door, to: altar }
        sprite: carpet_red
```

### Decoration Pipeline

```
BSP/CA generates rooms[]
  → Room type assignment (biome × size × seed → weighted random)
  → Template application:
      Place blocking furniture → modify grid[][]
      Place sprites → add to stageSprites[]
      Place lights → add to lights[]
      Place interactables → create entities
  → Enemies placed in remaining floor tiles
```

---

## Biome Catalog

### Indoor Biomes

| Biome | Generator | Tile Set | Feel |
|---|---|---|---|
| Stone Dungeon | BSP | Stone floor/wall, doors | Classic dungeon |
| Prison | BSP (narrow) | Stone, iron bars/doors | Claustrophobic cells |
| Mine | CA + Drunkard's Walk | Dirt, rock, rail, cart | Industrial decay |
| Crypt | BSP (small rooms) | Cobblestone, bone, sarcophagus | Creepy, quiet |
| Sewer | Drunkard's Walk | Wet stone, deep water channel | Disgusting |
| Library | BSP (large rooms) | Marble, carpet, bookshelves | Scholarly |
| Temple | BSP + Prefab | Marble, gold trim, altar | Sacred/corrupted |
| Forge | BSP (medium) | Stone, metal grate, furnace | Hot, industrial |

### Outdoor Biomes

| Biome | Generator | Tile Set | Feel |
|---|---|---|---|
| Forest | CA + Perlin | Grass, tree, dirt path | Green, open |
| Dark Forest | CA (high fill%) | Dead grass, dead tree, fog | Oppressive |
| Jungle | CA (dense) + Perlin | Dense vine, canopy, mud | Dense, hard to see |
| Swamp | CA + Perlin (heavy water) | Murky water, mud, reed | Slow, wet, toxic |
| Mountain | Perlin (elevation) | Rock, gravel, snow | Exposed, vertical |
| Desert | CA (inverted) | Sand, sandstone, cactus | Dry, vast |
| Tundra | Perlin + CA | Snow, ice, frozen water | Cold, slippery |

### Special Biomes

| Biome | Generator | Tile Set | Feel |
|---|---|---|---|
| Mushroom Cavern | CA | Mycelium, fungus wall, glow pool | Alien, bioluminescent |
| Crystal Cave | CA + Prefab | Crystal floor, geode wall | Sparkly, dangerous |
| Corrupted Zone | Any + overlay | Pulsing flesh, bone, blood | Disturbing, alive |
| Flooded Ruins | BSP + Perlin water | Stone + deep water | Eerie, half-submerged |
| Volcanic | CA + Perlin | Basalt, magma, ash | Hot, deadly terrain |
| Root Network | L-System | Root floor, earth wall, vine | Organic, alive |
| Hive | CA (dense) | Wax floor, honeycomb wall | Buzzing, alien |

### Mushroom Cavern — Detail

| Feature | Tile/Sprite | Interaction |
|---|---|---|
| Giant Mushroom | Blocking | Some harvestable, some explode (spore burst AoE) |
| Glow Pool | Water + light source | Step in = spore exposure (CON DC 10) |
| Spore Cloud | Hazard zone (3×3-5×5) | CON save DC 13/turn. Fail = poisoned/confused |
| Mycelium Floor | Floor variant | Muffles steps (stealth+), alerts fungal enemies |
| Spore Vent | Floor, periodic | Erupts spore cloud every 5 turns (3×3) |
| Luminescent Fungus | Wall decoration, light | Natural cave lighting |
| Seed Pod | Interactive | Harvest ingredient, or throw (spore bomb) |

### Jungle — Detail

| Feature | Tile/Sprite | Interaction |
|---|---|---|
| Dense Canopy | Wall (organic) | Some can be cut (slashing weapon + turns) |
| Mud Floor | Floor (1.5× move cost) | Slows everyone including enemies |
| Hanging Vines | Hazard | Some grab (DEX save or restrained 1 turn) |
| River | Deep water | Swim (CON check) or find bridge/log |
| Quicksand | Hidden trap | STR check each turn or sink (die in 3 turns) |
| Fruit Tree | Interactive | Harvest minor heal or ingredient |
| Canopy Shadow | Visual | Reduced vision (sight = 3 in thick areas) |

---

## Zone Modifiers

Seed picks 0-1 environmental + 0-1 objective modifier per zone.

### Environmental Modifiers

| Modifier | Effect | Player Options |
|---|---|---|
| **Flooded** | 30% floor→water, 2× movement cost, blocked paths | Drain levers, swim (CON), push through |
| **Dark** | Vision = 2, torches dim | Lantern, light spell, careful movement |
| **Toxic Gas** | 1 HP/5 turns, gas clouds | Find vents, rush, Antidote |
| **Webbed** | Sticky tiles (slow), blocked doors | Burn (fire), cut (STR), avoid |
| **Cave-In** | Rubble blocks paths, timed collapses | Detour, clear (STR/bomb), rush |
| **Alarm** | Patrol spawns every X turns | Stealth, rush, fight waves |
| **Frozen** | Ice tiles (slide), frozen doors | Melt (fire), careful movement |
| **Cursed** | Random debuff each room entered | Remove Curse scroll, resist (WIS) |

### Cave-In Variants

| Variant | Trigger | Effect | Resolution |
|---|---|---|---|
| Scripted | Step on tile (one-time) | Block main path | Find alternate route |
| Timed | After X turns, sections collapse | Rubble shrinks safe area | Rush or clear rubble |
| Trap | Pressure plate | 3×3 rubble + 2d6 damage | Avoid or disarm |
| Boss | Boss at 50% HP | Seal arena entrance | Kill or die |

### Objective Modifiers

| Modifier | Objective | How |
|---|---|---|
| **Sealed Exit** | Exit locked, need 3 keystones | Find in chests/enemies/hidden rooms |
| **Flooded Cave** | Water blocks path, need 2 drain levers | Find levers in side rooms |
| **Collapsed Bridge** | Main path broken, need rope + planks | Find materials, use at bridge |
| **Warded Door** | Boss door has 3 seals | Destroy crystals (mini-boss each) |
| **Lockdown** | Alarm triggered, gate closes in 30 turns | Rush to exit or find override |
| **Treasure Vault** | Find 4 key fragments → opens vault | Explore all branches |
| **Bounty Target** | Named elite hiding on map | Hunt and kill for bonus |
| **Rescue** | NPC prisoner, escort to exit | Find, free, protect |

### YAML Zone Modifier Example

```yaml
modifiers:
  - id: cave_in
    weight: 10
    zones: [warren_entrance, deep_warren]
    effects:
      - type: environmental
        description: "The walls are cracking. This place won't hold forever."
        visual: dust_particles
      - type: scripted_collapse
        trigger: { room: 3 }
        collapse_area: { ahead: 5, width: 3 }
        tile: RUBBLE
        message: "*CRASH* The ceiling collapses! Find another way."
      - type: timed_collapse
        start_turn: 60
        interval: 20
        collapse_count: 3
      - type: rubble_interaction
        options:
          - label: "Clear rubble"
            check: { stat: STR, dc: 12 }
            success: { replace: FLOOR, turns: 3 }
          - label: "Blast with bomb"
            requires: { item: bomb, consume: true }
            effect: { replace: FLOOR, aoe: 3x3 }
```

---

## Traps

| Trap | Tile | Detection | Trigger | Effect | Disarm |
|---|---|---|---|---|---|
| **Pressure Plate** | Hidden | WIS DC 12 (passive) | Step on | Arrow (1d8) or pit (1d6+prone) | DEX DC 12, Thieves' Tools |
| **Tripwire** | Hidden | WIS DC 14 | Step on | Alarm or net (restrained 2 turns) | DEX DC 10 |
| **Poison Dart** | Wall | WIS DC 13 | Step adjacent | 1d4 + poisoned 3 turns | Not disarmable |
| **Floor Spikes** | Hidden | WIS DC 15 | Step on | 2d6 piercing | DEX DC 14 |
| **Rune Trap** | Visible (glowing) | Always visible | Step on | 2d8 elemental | INT DC 14, trigger from range |
| **Collapsing Floor** | Visible (cracked) | Always visible | Step on | Fall (2d6), lower room | Jump (DEX check) |
| **Alarm Crystal** | Visible (wall) | Always visible | Enter room | All enemies alerted | Break first or sneak (DEX DC 13) |
| **Mimic** | Looks like chest | WIS DC 16 | Open | Surprise attack (2d8+grapple) | Identify or WIS check |
| **Quicksand** | Hidden (jungle) | WIS DC 14 | Step on | STR check/turn or die in 3 turns | Avoid, rope from ally |

### Class Trap Bonuses

| Class | Advantage |
|---|---|
| Rogue | +5 detection, can disarm with Thieves' Tools |
| Wizard | Detect Rune Traps at range, dispel with INT check |
| Fighter | Resist trap damage (CON save for half) |
| Cleric | Detect Mimics (WIS bonus), cure poison |

---

## Locked Doors

| Lock Type | Open Method | Found Where |
|---|---|---|
| **Key lock** | Find key from enemy/chest | Between biome sections |
| **Skill lock** | DEX + Thieves' Tools (DC 10-18) | Side rooms, treasure rooms |
| **Puzzle lock** | Pull levers in order | Vault doors |
| **Boss lock** | Kill key-holder mini-boss | Gate to boss area |
| **Sealed** | Quest item required | Story gates |
| **Breakable** | Attack (HP 20-50, bludgeon effective) | Wooden doors, weak walls |

---

## Dungeon NPCs

| NPC | Where | Interaction |
|---|---|---|
| **Prisoner** | Prison cell (locked) | Rescue → town reward or summon token |
| **Wounded Adventurer** | Random room (15% per zone) | Heal (give potion) → info + item. Ignore → dies (flag). |
| **Traveling Merchant** | Camp prefab (15% per zone) | Buy/sell, limited stock, expensive |
| **Traitor** | Disguised as prisoner | "Free" → ambush! WIS DC 15 to detect. |
| **Ghost** | Crypt/ruin | Dialog → quest info, warns of traps |
| **Goblin Deserter** | Dead-end room | Spare → intel on boss. Kill → loot. |
| **Caged Beast** | Mine/cave | Free → fights alongside temporarily. |

---

## Surprise Events

| Event | Trigger | What Happens | Counter |
|---|---|---|---|
| **Thief!** | Enter room with hidden enemy | Steals 1 random item, flees | Chase (DEX), fight |
| **Pickpocket** | Walk past disguised NPC | Lose gold (10-50g) | WIS passive check |
| **Trapped Chest** | Open booby-trapped chest | Explosion (2d6) + items scatter | Detect trap first (WIS) |
| **Mimic Ambush** | Open "chest" | Surprise round combat | Detect (WIS DC 16) |
| **Ambush Room** | Enter decorated room | Doors slam, enemies spawn | Detect (WIS DC 14) |
| **Cursed Item** | Pick up floor item | Cursed, equips and sticks | Identify first, Remove Curse |
| **Alarm** | Open wrong door / break crystal | All enemies alerted, rush you | Stealth, prepare |

---

## Biomes Per World

| World | Main Biomes | Side Dungeon Biomes |
|---|---|---|
| **W1: Goblin Invasion** | Forest, Stone Dungeon, Mine, Prison | Mushroom Cavern, Crypt |
| **W2: Undead Plague** | Dark Forest, Crypt, Sewer, Flooded Ruins | Temple, Corrupted Zone |
| **W3: Wild Lands** | Jungle, Swamp, Root Network, Hive | Crystal Cave, Volcanic |
| **W4: Mountain War** | Mountain Pass, Forge, Stone Dungeon, Tundra | Library, Throne Room |
| **W5: The Source** | Corrupted Zone, Volcanic, Crystal Cave, Temple | ??? |

---

## What Needs Building

### Generators

| Feature | Status | Effort |
|---|---|---|
| BSP | Built | — |
| Cellular Automata | Built | — |
| Drunkard's Walk | Need | Small |
| Perlin Noise overlay | Need | Small |
| Prefab Stamping | Need | Medium |
| Maze (Prim's) | Need (nice-to-have) | Small |
| L-System branching | Need (nice-to-have) | Medium |
| Hybrid multi-biome splitter | Need | Medium |

### Map Features

| Feature | Status | Effort |
|---|---|---|
| Tile themes (biome tile sets) | Need | Small |
| Room decoration templates | Need | Medium |
| Trap system (8 types + detection + disarm) | Need (chest traps partial) | Medium |
| Locked doors (key, skill, puzzle, breakable) | Partially built | Small |
| Dungeon NPCs | Need (interactable entity exists) | Medium |
| Surprise events | Need (event runner exists) | Medium |
| Zone modifiers (env + objective) | Need | Medium |
| World plan + zone seed derivation | Need | Small |
| Waypoint zone-to-zone travel | Need | Medium |
| Branch choice UI | Need | Small |
| Forward-only (no town TP) | Need | Small |
| Stash deposit-only at waypoints | Need | Small |
| Challenge map state freeze/restore | Need | Medium |

---

## Open Questions

- Exact resource budget per world (how many potions should player need?)
- Traveling merchant: what stock, how priced?
- Boss fight design (Goblin Warlord mechanics)
- World-to-world progression (how unlock W2?)
- Save/checkpoint system (save at waypoints? permadeath? save-and-quit?)
- Minimap or auto-map feature?
- Fog of war behavior on revisited zones (stay revealed or re-fog?)
