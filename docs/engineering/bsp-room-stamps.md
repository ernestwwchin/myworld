# BSP Room Stamps - Prefab Templates

Predefined room templates ("stamps") that can be placed by the BSP map generator to create interesting, hand-crafted room layouts within procedurally generated dungeons.

## Overview

**Room stamps** are small, pre-designed room layouts that inject variety and intentional design into procedurally generated BSP dungeons. Instead of every room being a plain rectangle, stamps add:

- **Functional variety**: Treasure rooms, traps, shrines, arenas
- **Visual interest**: Columns, decorations, furniture
- **Gameplay depth**: Cover, chokepoints, ambush zones
- **Storytelling**: Environmental narratives

## Stamp System Design

### Stamp Structure

```yaml
# Example: treasure_room_1.yaml
stamp_id: treasure_room_1
name: "Guarded Treasure Room"
size:
  min_width: 7
  min_height: 7
  width: 9
  height: 9
tags: [treasure, combat, medium, valuable]
difficulty: 2
grid: |
  #########
  #.......#
  #.#...#.#
  #.......#
  #...C...#
  #.......#
  #.#...#.#
  #.......#
  #########
entities:
  - type: chest
    x: 4
    y: 4
    loot: treasure_hoard
  - type: enemy
    x: 2
    y: 2
    creature: goblin_guard
  - type: enemy
    x: 6
    y: 2
    creature: goblin_guard
props:
  - type: column
    x: 2
    y: 2
  - type: column
    x: 6
    y: 2
  - type: column
    x: 2
    y: 6
  - type: column
    x: 6
    y: 6
```

### Tile Legend

```
# = Wall
. = Floor
D = Door
C = Chest
T = Trap
S = Stairs
W = Water
~ = Pit/Hole
@ = Spawn point (player/enemy)
* = Light source (torch)
P = Pillar/Column
```

---

## 1. Basic Room Stamps

### Empty Rectangular Rooms

#### Small Empty Room (5x5)
```
#####
#...#
#...#
#...#
#####
```
**Tags**: `empty`, `small`, `basic`  
**Use**: Filler rooms, rest areas

#### Medium Empty Room (7x7)
```
#######
#.....#
#.....#
#.....#
#.....#
#.....#
#######
```
**Tags**: `empty`, `medium`, `basic`  
**Use**: Combat arenas, open spaces

#### Large Empty Room (11x11)
```
###########
#.........#
#.........#
#.........#
#.........#
#.........#
#.........#
#.........#
#.........#
#.........#
###########
```
**Tags**: `empty`, `large`, `boss`  
**Use**: Boss rooms, major encounters

---

## 2. Functional Room Stamps

### Treasure Rooms

#### Treasure Room with Pillars (9x9)
```
#########
#.......#
#.P...P.#
#.......#
#...C...#
#.......#
#.P...P.#
#.......#
#########
```
**Entities**: Central chest, 4 pillars provide cover  
**Tags**: `treasure`, `pillars`, `medium`  
**Difficulty**: 1-2

#### Vault Room (7x9)
```
#########
#.......#
#.#####.#
#.#CCC#.#
#.#####.#
#.......#
#########
```
**Entities**: 3 chests in walled vault, single entrance  
**Tags**: `treasure`, `vault`, `high-value`  
**Difficulty**: 3

### Trap Rooms

#### Spike Corridor (5x9)
```
#########
#.......#
#.TTTTT.#
#.......#
#########
```
**Entities**: Row of spike traps  
**Tags**: `trap`, `corridor`, `hazard`  
**Difficulty**: 1

#### Treasure Trap (7x7)
```
#######
#.....#
#.TTT.#
#.TCT.#
#.TTT.#
#.....#
#######
```
**Entities**: Chest surrounded by traps  
**Tags**: `treasure`, `trap`, `puzzle`  
**Difficulty**: 2

### Shrine Rooms

#### Small Shrine (7x7)
```
#######
#.....#
#..P..#
#.....#
#..S..#
#.....#
#######
```
**Entities**: Central shrine pedestal, item/buff  
**Tags**: `shrine`, `reward`, `rest`  
**Difficulty**: 0

#### Healing Fountain (9x9)
```
#########
#.......#
#.......#
#...W...#
#..WWW..#
#...W...#
#.......#
#.......#
#########
```
**Entities**: Water fountain (healing)  
**Tags**: `shrine`, `fountain`, `healing`  
**Difficulty**: 0

---

## 3. Combat-Oriented Stamps

### Arena Rooms

#### Small Arena (9x9)
```
#########
#.......#
#.......#
#.......#
#...@...#
#.......#
#.......#
#.......#
#########
```
**Entities**: Central spawn point for boss/elite  
**Tags**: `arena`, `combat`, `boss`  
**Difficulty**: Variable

#### Pillared Arena (11x11)
```
###########
#.........#
#.P.....P.#
#.........#
#.........#
#....@....#
#.........#
#.........#
#.P.....P.#
#.........#
###########
```
**Entities**: 4 corner pillars, central spawn  
**Tags**: `arena`, `pillars`, `tactical`  
**Difficulty**: 2-3

### Ambush Rooms

#### Flanking Room (11x9)
```
###########
#.........#
#@#.....#@#
#.#.....#.#
#.#.....#.#
#@#.....#@#
#.........#
###########
```
**Entities**: 4 alcoves for ambush spawns  
**Tags**: `ambush`, `tactical`, `dangerous`  
**Difficulty**: 3

#### Chokepoint Room (9x7)
```
#########
#.......#
###D.D###
#.......#
###D.D###
#.......#
#########
```
**Entities**: Multiple doors create chokepoints  
**Tags**: `chokepoint`, `tactical`, `defensive`  
**Difficulty**: 2

---

## 4. Environmental Stamps

### Water/Hazard Rooms

#### Shallow Pool (9x9)
```
#########
#.......#
#.WWWWW.#
#.W...W.#
#.W...W.#
#.W...W.#
#.WWWWW.#
#.......#
#########
```
**Entities**: Water pool (slows movement)  
**Tags**: `water`, `environmental`, `hazard`  
**Difficulty**: 1

#### Pit Room (7x7)
```
#######
#.....#
#.~~~.#
#.~.~.#
#.~~~.#
#.....#
#######
```
**Entities**: Pit holes (fall damage)  
**Tags**: `pit`, `hazard`, `environmental`  
**Difficulty**: 2

### Decorated Rooms

#### Columned Hall (13x7)
```
#############
#...........#
#.P.P.P.P.P.#
#...........#
#.P.P.P.P.P.#
#...........#
#############
```
**Entities**: 10 columns in rows  
**Tags**: `decorated`, `hall`, `pillars`  
**Difficulty**: 1

#### Banquet Hall (11x9)
```
###########
#.........#
#.P.....P.#
#.........#
#.........#
#.........#
#.P.....P.#
#.........#
###########
```
**Entities**: 4 corner columns, empty center  
**Tags**: `decorated`, `banquet`, `large`  
**Difficulty**: 0

---

## 5. Corridor Stamps

### Straight Corridors

#### Short Corridor (3x5)
```
#####
#...#
#...#
#####
```
**Tags**: `corridor`, `short`, `basic`

#### Long Corridor (3x11)
```
###########
#.........#
#.........#
###########
```
**Tags**: `corridor`, `long`, `basic`

### Special Corridors

#### Torch-Lit Corridor (3x11)
```
###########
#*........*#
#.........#
###########
```
**Entities**: Torches at both ends  
**Tags**: `corridor`, `lit`, `atmospheric`

#### Trapped Corridor (3x11)
```
###########
#....T....#
#.........#
###########
```
**Entities**: Mid-corridor trap  
**Tags**: `corridor`, `trap`, `hazard`

---

## 6. Special Room Types

### Library/Study

#### Small Library (9x9)
```
#########
#.......#
#.#####.#
#.#...#.#
#.#.C.#.#
#.#...#.#
#.#####.#
#.......#
#########
```
**Entities**: Central chest (scrolls/books), enclosed reading area  
**Tags**: `library`, `loot`, `knowledge`

### Barracks

#### Guard Barracks (9x11)
```
###########
#.........#
#.@.....@.#
#.........#
#.........#
#.........#
#.@.....@.#
#.........#
###########
```
**Entities**: 4 guard spawn points  
**Tags**: `barracks`, `guards`, `combat`

### Prison

#### Cell Block (11x9)
```
###########
#.#.#.#.#.#
#.........#
#.#.#.#.#.#
#.........#
#.#.#.#.#.#
#.........#
###########
```
**Entities**: 5 prison cells, potential prisoners/enemies  
**Tags**: `prison`, `cells`, `rescue`

---

## Stamp Integration with BSP

### Placement Rules

```typescript
interface StampPlacementRules {
  minRoomSize: { width: number; height: number };
  tags: string[];
  probability: number; // 0-1
  maxPerMap: number;
  requiresAccess: boolean; // Must connect to main path
  edgeBuffer: number; // Tiles from room edge
}
```

### Example BSP Integration

```typescript
import { loadStamp } from './stamps';
import { BSPGenerator } from './mapgen';

function applyStampToRoom(room: Room, stamp: Stamp): void {
  // Check if stamp fits
  if (room.width < stamp.width || room.height < stamp.height) {
    return; // Stamp too large
  }
  
  // Center stamp in room
  const offsetX = Math.floor((room.width - stamp.width) / 2);
  const offsetY = Math.floor((room.height - stamp.height) / 2);
  
  // Apply stamp grid
  for (let y = 0; y < stamp.height; y++) {
    for (let x = 0; x < stamp.width; x++) {
      const tileChar = stamp.grid[y][x];
      const worldX = room.x1 + offsetX + x;
      const worldY = room.y1 + offsetY + y;
      
      map[worldY][worldX] = charToTile(tileChar);
    }
  }
  
  // Place entities
  for (const entity of stamp.entities) {
    spawnEntity(
      room.x1 + offsetX + entity.x,
      room.y1 + offsetY + entity.y,
      entity.type
    );
  }
}
```

### Stamp Selection Strategy

```typescript
function selectStampForRoom(room: Room, depth: number): Stamp | null {
  const candidates = stamps.filter(stamp => {
    // Size check
    if (room.width < stamp.size.min_width || room.height < stamp.size.min_height) {
      return false;
    }
    
    // Difficulty check (match to dungeon depth)
    if (stamp.difficulty > depth + 1) {
      return false;
    }
    
    return true;
  });
  
  if (candidates.length === 0) return null;
  
  // Weight by tags
  const weights = candidates.map(stamp => {
    let weight = 1.0;
    
    // Prefer combat rooms in mid-dungeon
    if (depth > 2 && stamp.tags.includes('combat')) weight *= 1.5;
    
    // Prefer treasure rooms occasionally
    if (Math.random() < 0.2 && stamp.tags.includes('treasure')) weight *= 2.0;
    
    return weight;
  });
  
  return weightedRandom(candidates, weights);
}
```

## Stamp Library Structure

Organize stamps in `public/data/stamps/`:

```
stamps/
  basic/
    empty_small.yaml
    empty_medium.yaml
    empty_large.yaml
  treasure/
    treasure_pillars.yaml
    treasure_vault.yaml
  combat/
    arena_small.yaml
    arena_pillared.yaml
    ambush_flanking.yaml
  environmental/
    pool_shallow.yaml
    pit_room.yaml
    columned_hall.yaml
  special/
    library_small.yaml
    barracks_guard.yaml
    prison_cells.yaml
```

## Advanced Techniques

### Dynamic Stamp Mutation

Mutate stamps at placement time:
- **Rotation**: Rotate 90°, 180°, 270°
- **Mirroring**: Flip horizontally/vertically
- **Scaling**: Stretch/shrink within limits
- **Decoration**: Add random props/decorations

### Stamp Chaining

Create multi-room complexes:
```yaml
stamp_id: throne_room_complex
type: compound
rooms:
  - stamp: throne_room_main
    position: center
  - stamp: guard_barracks
    position: left
    connection: door
  - stamp: treasure_vault
    position: right
    connection: locked_door
```

### Contextual Stamps

Stamps that change based on context:
```typescript
function getContextualStamp(room: Room, adjacentRooms: Room[]): Stamp {
  if (adjacentRooms.length === 1) {
    return getStamp('dead_end_treasure');
  } else if (adjacentRooms.length >= 3) {
    return getStamp('junction_hub');
  } else {
    return getStamp('corridor_room');
  }
}
```

## Next Steps

- See [Tile Catalog](./tile-catalog.md) for tile reference
- See [Autotiling Guide](./autotiling.md) for smooth stamp edges
- Create custom stamps in `public/data/stamps/custom/`
- Try the [Stamp Editor Tool](../../scratch/stamp-editor.html)
