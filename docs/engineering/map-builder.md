# Map Builder — Room Rendering & Tile Stamper

Reference for the room-test.html rendering system and the tile stamper architecture.

## Overview

`room-test.html` is a standalone test page that renders 11 rooms (7 dungeon, 4 sewer) using canvas-based tile rendering. It demonstrates autotile wall selection, floor tile variety, dirt edge shadows, and half-floor tiles behind walls.

## Cell Types

Each grid cell is one of three types:

| Type    | Description |
|---------|------------|
| `floor` | Walkable ground — receives floor tile + optional dirt overlay |
| `wall`  | Solid obstacle — receives wall sprite (16×32) + optional floor peeking behind |
| `void`  | Empty space — renders black (out-of-bounds defaults to void) |

## Rendering Layers

Tiles are drawn in layer order per cell (bottom to top):

| Layer  | Z-Index | Source Atlas | Tile Size | Purpose |
|--------|---------|-------------|-----------|---------|
| floor  | 1 | floor atlas | 16×16 | Base floor tile, or half-floor behind walls |
| dirt   | 2 | floor atlas | 16×16 | Edge shadow overlay near walls (top/left/right) |
| wall   | 3 | wall atlas  | 16×32 | High wall sprite, drawn offset −16px up |
| object | 4 | — | — | Future: chests, doors, interactables |
| debug  | 5 | — | — | Coord labels, tile IDs |

## Atlas Files

```
public/assets/vendor/0x72_dungeon/
├── 0x72_DungeonTilesetII_v1.7/
│   ├── atlas_floor-16x16.png          # Dungeon floors (112×112, 7×7 @16px)
│   └── atlas_walls_high-16x32.png     # Dungeon walls (16×32 per tile)
└── 0x72_DungeonTilesetII_sewers_v0.3/
    ├── floor.png                      # Sewer floors (144×80, 9×5 @16px)
    └── atlas_walls_high-16x32.png     # Sewer walls (16×32 per tile)
```

## Tile Reference Format

### Normal tile — full 16×16 from atlas grid
```js
[col, row]    // e.g. [0, 0] = top-left tile, [4, 3] = col 4 row 3
```

### Custom clip — sub-rect extraction (for tiles without dedicated atlas art)
```js
{ col: 0, row: 1, clip: { x: 8, y: 0, w: 8, h: 16 }, dx: 8, dy: 0 }
```
- `col, row` — atlas grid position
- `clip` — source sub-rect within that tile (default: full 16×16)
- `dx, dy` — destination offset on canvas (default: 0, 0)

## Wall Autotile

### 4-bit connectivity lookup

Walls use a 4-directional neighbor check (N/S/E/W) to pick the correct tile from the atlas:

```
N S → row:  !N+S=0  N+S=1  N+!S=2  !N+!S=3
E W → col:  !E+!W=0  E+!W=1  E+W=2  !E+W=3
```

This gives 16 combinations mapped to a 4×4 region of the wall atlas.

### Brick variants (~20%)

`tileHash(r, c, 5) === 0` triggers a brick-variant swap for visual variety. Each tileset defines which base tiles have variants:

```js
// Dungeon brick variants
'2,1' → [[4,0],[7,0]]    // horizontal mid
'1,1' → [[4,2]]          // east-only mid
'3,1' → [[7,2]]          // west-only mid
// ... etc
```

### Void tiles (reference only — not auto-selected)

The `DUNGEON_VOID` and `SEWER_VOID` tables map base tiles + void-direction flags to special tiles for pools, pits, hidden rooms. These are for **manual placement** in an editor, not auto-resolved.

## Floor Tile Selection

### Dungeon floors

The dungeon atlas has dedicated tiles for every edge case:

| Role | Atlas [col,row] | Notes |
|------|-----------------|-------|
| plain | [0,0]×9, [1,0], [2,0] | 9:1:1 weighting — reduces crack frequency |
| topDirtOverlay | [4,0], [5,0] | Overlay: dark top edge near north wall |
| topDirtLessLeft | [3,0] | Overlay: dirt fades left (east neighbor is open) |
| topDirtLessRight | [6,0] | Overlay: dirt fades right (west neighbor is open) |
| halfTopL | [4,2] | Left half-floor, top of vertical run |
| halfMidL | [4,3] | Left half-floor, mid vertical run |
| halfBotL | [4,4] | Left half-floor, bottom of vertical run |
| halfCleanL | [4,5] | Left half-floor, isolated (no vertical neighbors) |
| halfDirtTopL | [4,6] | Left half-floor with dirt (north wall + void west) |
| halfTopR..halfDirtTopR | [5,2]..[5,6] | Right-side mirrors of above |

**Dungeon overlay system**: Plain floor is drawn first, then a dirt overlay composited on top. Supports optional tint (e.g. `rgba(120,20,15,0.7)` for bloody rooms).

### Sewer floors

The sewer atlas has **no native half-floor tiles** — half-floors are achieved by clipping dirt tiles:

| Role | Atlas [col,row] | Notes |
|------|-----------------|-------|
| plain | [0,0] | Only variant (others look like traps) |
| topDirtBaked | [1,3], [2,3] | Full-width dark top edge |
| topDirtLessLeft | [0,3] | Top dirt, fades left |
| topDirtLessRight | [3,3] | Top dirt, fades right |
| leftDirtBaked | [0,1], [2,1] | Dark left edge (wall to west) |
| rightDirtBaked | [1,1], [3,1] | Dark right edge (wall to east) |
| bottomDirtBaked | [1,2], [2,2] | Dark bottom edge (currently unused) |

**Sewer half-floor**: When a wall cell has floor to one side, the renderer clips a dirt tile to 8px to show floor peeking behind. `leftDirtBaked` is used when clipping the right half (dark faces the wall on left), and vice versa.

## Floor Context Detection

For floor cells adjacent to walls, the renderer checks:

```
northIsWall → top dirt (shadow from wall above)
  └─ eastOpen (east neighbor's north is not wall) → less-right variant
  └─ westOpen (west neighbor's north is not wall) → less-left variant
  └─ both open → plain floor (no dirt)
southIsWall → plain floor (bottom dirt removed — ambiguous in 1-wide corridors)
else → plain floor
```

For wall cells showing floor behind:

```
eIsFloor && wIsFloor → full plain floor
eIsFloor only → left half-floor (check vertical run: top/mid/bot/clean)
wIsFloor only → right half-floor (check vertical run: top/mid/bot/clean)
sIsFloor || nIsFloor → full plain floor
```

Half-floor vertical context checks the **floor neighbor's** N/S neighbors (not the wall cell's own neighbors).

## Deterministic Pseudo-Random

`tileHash(r, c, mod)` produces a deterministic hash from grid position:

```js
function tileHash(r, c, mod) {
  let h = (r * 2654435761 ^ c * 2246822519) >>> 0;
  h = ((h >> 16) ^ h) * 0x45d9f3b >>> 0;
  h = ((h >> 16) ^ h) >>> 0;
  return h % mod;
}
```

Used for: floor variety, brick variant selection, dirt tile picking. Same position always produces the same tile — no flicker on re-render.

## Room Grid Builders

| Function | Size | Description |
|----------|------|-------------|
| `buildSimpleRoom()` | 9×10 | Floor rectangle + wall border + void margin |
| `buildCorridor()` | 10×14 | Two rooms connected by 2-wide vertical corridor |
| `buildEdgeRoom()` | 8×7 | Walls flush with grid boundary (row 0 / col 0) |
| `buildLRoom()` | 12×10 | L-shape: horizontal arm + vertical arm |
| `buildMaze()` | 13×11 | 1-wide corridor maze (all 16 autotile combos) |
| `buildLargeRoom()` | 16×12 | Large room with interior pillar pairs |

Grid convention: `grid[row][col]`, values are `'floor'`, `'wall'`, or `'void'`.

## Tile Stamper (Planned Refactor)

### stamp() — single draw function

```js
function stamp(ctx, atlas, tile, scale) {
  if (Array.isArray(tile)) {
    // Full tile: [col, row]
    const [col, row] = tile;
    ctx.drawImage(atlas, col*16, row*16, 16, 16, 0, 0, 16*scale, 16*scale);
  } else {
    // Custom clip: { col, row, clip, dx, dy }
    const { col, row, clip, dx=0, dy=0 } = tile;
    const sx = col*16 + (clip?.x ?? 0);
    const sy = row*16 + (clip?.y ?? 0);
    const sw = clip?.w ?? 16;
    const sh = clip?.h ?? 16;
    ctx.drawImage(atlas, sx, sy, sw, sh, dx*scale, dy*scale, sw*scale, sh*scale);
  }
}
```

### Layer resolvers

Each layer has a resolver function that examines grid context and returns tile references:

```
for each cell (r, c):
  for each layer:
    tiles = layer.resolve(grid, r, c, tileset)
    for each tile: stamp(ctx, atlas, tile, scale)
```

**Resolvers are optional** — the game uses auto-resolvers; a tile editor lets users pick tiles directly. Both feed the same `stamp()` function.

### Benefits
- Eliminates `noHalfFloor` / `hasOverlays` branching
- Sewer half-floor uses clip config instead of special code path
- Same tile ref format works for game rendering AND editor palette
- Easy to add new layers (fog, lighting, objects)

## Test Rooms

The page renders 11 rooms to validate all edge cases:

1. **Simple room** (dungeon) — basic floor + wall + dirt
2. **Corridor** — 2-wide passage connecting two rooms
3. **Bloody room** — same as #1 with red dirt tint
4. **Edge room** — walls at grid boundary (void fill)
5. **L-shape** — inner corners, T-junctions
6. **Maze** — all 16 wall connectivity combos, dead-ends
7. **Large room** — brick variants, interior pillars
8–11. **Sewer variants** — simple, corridor, edge, L-shape with sewer tileset
