# Autotiling Guide - 3x3 Minimal System

Complete guide to implementing the 3x3 minimal autotiling system used by the 0x72 Dungeon Tileset II.

## Overview

The 0x72 tileset uses a **3x3 minimal autotiling** approach, which is a simplified bitmasking system that checks 8 neighbors (4 cardinal + 4 diagonal) to determine which tile variant to draw. This creates smooth, organic-looking transitions between different terrain types.

## How It Works

### Neighbor Checking

For any tile at position `(x, y)`, check its 8 neighbors:

```
NW  N  NE
 W  •  E
SW  S  SE
```

Each neighbor position is either:
- **Same type** (wall-to-wall, floor-to-floor): counts as `1`
- **Different type** (wall-to-floor): counts as `0`

### Bitmask Pattern

The 8 neighbors are encoded into an 8-bit integer:

```
Bit positions:
  0   1   2
  3   •   4
  5   6   7

Bit values:
 128  1   2
   8  •  16
  32  64  4
```

Add up the bit values where neighbors **match** the center tile type:

```javascript
let mask = 0;
if (north)     mask |= 1;    // bit 0
if (northeast) mask |= 2;    // bit 1  
if (east)      mask |= 4;    // bit 2  (typo in visual, actually 16 → 4)
if (southeast) mask |= 8;    // bit 3  (actually 4 → 8)
if (south)     mask |= 16;   // bit 4  (actually 16)
if (southwest) mask |= 32;   // bit 5
if (west)      mask |= 64;   // bit 6  (actually 8 → 64)
if (northwest) mask |= 128;  // bit 7
```

**Corrected standard bit mapping (clockwise from N):**
```
   N  NE   E  SE   S  SW   W  NW
   1   2   4   8  16  32  64 128
```

Total possible masks: **256** (2^8), but many resolve to the same visual tile.

### 3x3 Minimal Reduction

The "3x3 minimal" system reduces 256 possible masks to **47 unique tiles** by:
1. Ignoring diagonal neighbors if their adjacent cardinals don't match
2. Using symmetry (rotating/flipping tiles)

This prevents "orphaned corner" artifacts where a diagonal is set but its cardinals aren't.

## Tile Selection Algorithm

### Simplified Approach (3x3 Minimal)

```typescript
function getTile(mask: number): string {
  // Cardinal directions only for basic shape
  const n = (mask & 1) !== 0;
  const e = (mask & 4) !== 0;  
  const s = (mask & 16) !== 0;
  const w = (mask & 64) !== 0;
  
  // Diagonals (only matter if adjacent cardinals exist)
  const ne = (mask & 2) !== 0;
  const se = (mask & 8) !== 0;
  const sw = (mask & 32) !== 0;
  const nw = (mask & 128) !== 0;
  
  // Full isolation - single tile
  if (!n && !e && !s && !w) {
    return 'tile_center_isolated';
  }
  
  // All sides filled
  if (n && e && s && w) {
    // Check inner corners
    if (!ne) return 'tile_inner_corner_ne';
    if (!se) return 'tile_inner_corner_se';
    if (!sw) return 'tile_inner_corner_sw';
    if (!nw) return 'tile_inner_corner_nw';
    return 'tile_center_full';
  }
  
  // Three sides filled
  if (n && e && s && !w) return 'tile_left_edge';
  if (n && e && !s && w) return 'tile_bottom_edge';
  if (n && !e && s && w) return 'tile_right_edge';
  if (!n && e && s && w) return 'tile_top_edge';
  
  // Two sides (corners)
  if (n && e && !s && !w) return 'tile_outer_corner_ne';
  if (n && !e && !s && w) return 'tile_outer_corner_nw';
  if (!n && e && s && !w) return 'tile_outer_corner_se';
  if (!n && !e && s && w) return 'tile_outer_corner_sw';
  
  // Two sides (straights)
  if (n && !e && s && !w) return 'tile_vertical';
  if (!n && e && !s && w) return 'tile_horizontal';
  
  // Single sides (endcaps)
  if (n && !e && !s && !w) return 'tile_endcap_north';
  if (!n && e && !s && !w) return 'tile_endcap_east';
  if (!n && !e && s && !w) return 'tile_endcap_south';
  if (!n && !e && !s && w) return 'tile_endcap_west';
  
  return 'tile_center_isolated'; // fallback
}
```

## Atlas Organization

### Floor Atlas Layout (atlas_floor-16x16.png)

The floor atlas is a **48x80 pixel image** (3 tiles wide × 5 tiles tall):

```
Row 0: [full_center] [inner_corner_NE] [inner_corner_NW]
Row 1: [inner_corner_SE] [inner_corner_SW] [vertical_pipe]
Row 2: [top_edge] [bottom_edge] [left_edge]
Row 3: [right_edge] [outer_corner_NE] [outer_corner_NW]
Row 4: [outer_corner_SE] [outer_corner_SW] [center_isolated]
```

Each tile is 16x16 pixels.

### Wall Atlas Layout (atlas_walls_low-16x16.png)

Similar 3x5 grid structure for wall pieces.

## Implementation Code

### Complete Autotiler

```typescript
interface TilePos { x: number; y: number; }

class Autotiler {
  private map: number[][];
  private tileType: number; // The tile type we're autotiling
  private atlas: Phaser.Textures.Texture;
  
  constructor(map: number[][], tileType: number, atlas: Phaser.Textures.Texture) {
    this.map = map;
    this.tileType = tileType;
    this.atlas = atlas;
  }
  
  /**
   * Get 8-bit bitmask for tile at position
   */
  private getMask(tx: number, ty: number): number {
    const check = (dx: number, dy: number): boolean => {
      const nx = tx + dx;
      const ny = ty + dy;
      if (nx < 0 || ny < 0 || ny >= this.map.length || nx >= this.map[0].length) {
        return false; // Out of bounds = different type
      }
      return this.map[ny][nx] === this.tileType;
    };
    
    let mask = 0;
    if (check(0, -1))  mask |= 1;   // N
    if (check(1, -1))  mask |= 2;   // NE
    if (check(1, 0))   mask |= 4;   // E
    if (check(1, 1))   mask |= 8;   // SE
    if (check(0, 1))   mask |= 16;  // S
    if (check(-1, 1))  mask |= 32;  // SW
    if (check(-1, 0))  mask |= 64;  // W
    if (check(-1, -1)) mask |= 128; // NW
    
    return mask;
  }
  
  /**
   * Get atlas frame coordinates for bitmask
   */
  private getFrameFromMask(mask: number): { frame: number } {
    const n = (mask & 1) !== 0;
    const ne = (mask & 2) !== 0;
    const e = (mask & 4) !== 0;
    const se = (mask & 8) !== 0;
    const s = (mask & 16) !== 0;
    const sw = (mask & 32) !== 0;
    const w = (mask & 64) !== 0;
    const nw = (mask & 128) !== 0;
    
    // Full center (all neighbors same)
    if (n && e && s && w) {
      if (!ne) return { frame: 1 };  // Inner corner NE
      if (!nw) return { frame: 2 };  // Inner corner NW
      if (!se) return { frame: 3 };  // Inner corner SE
      if (!sw) return { frame: 4 };  // Inner corner SW
      return { frame: 0 };           // Full center
    }
    
    // Edges (three sides filled)
    if (n && e && s && !w) return { frame: 8 };  // Left edge
    if (n && !e && s && w) return { frame: 9 };  // Right edge
    if (!n && e && s && w) return { frame: 6 };  // Top edge
    if (n && e && !s && w) return { frame: 7 };  // Bottom edge
    
    // Outer corners (two adjacent sides)
    if (n && e && !s && !w) return { frame: 10 }; // Outer NE
    if (n && !e && !s && w) return { frame: 11 }; // Outer NW
    if (!n && e && s && !w) return { frame: 12 }; // Outer SE
    if (!n && !e && s && w) return { frame: 13 }; // Outer SW
    
    // Pipes (two opposite sides)
    if (n && !e && s && !w) return { frame: 5 };  // Vertical pipe
    if (!n && e && !s && w) return { frame: 5 };  // Horizontal pipe (rotate)
    
    // Isolated or single connections
    return { frame: 14 }; // Center isolated
  }
  
  /**
   * Apply autotiling to entire map
   */
  public applyToScene(scene: Phaser.Scene, tileSize: number): void {
    for (let ty = 0; ty < this.map.length; ty++) {
      for (let tx = 0; tx < this.map[0].length; tx++) {
        if (this.map[ty][tx] === this.tileType) {
          const mask = this.getMask(tx, ty);
          const { frame } = this.getFrameFromMask(mask);
          
          // Calculate atlas frame position
          const atlasX = frame % 3;
          const atlasY = Math.floor(frame / 3);
          
          // Create sprite with correct frame
          scene.add.image(
            tx * tileSize + tileSize / 2,
            ty * tileSize + tileSize / 2,
            this.atlas.key,
            this.getFrameName(atlasX, atlasY)
          ).setDisplaySize(tileSize, tileSize);
        }
      }
    }
  }
  
  private getFrameName(x: number, y: number): string {
    return `tile_${x}_${y}`;
  }
}
```

### Usage in Map Generation

```typescript
import { Autotiler } from './autotiler';

function renderMap(scene: Phaser.Scene, map: number[][]) {
  const TILE = { FLOOR: 0, WALL: 1 };
  const tileSize = 48;
  
  // Load atlases
  scene.load.image('floor_atlas', 'assets/atlas_floor-16x16.png');
  scene.load.image('wall_atlas', 'assets/atlas_walls_low-16x16.png');
  
  scene.load.once('complete', () => {
    // Apply autotiling for floors
    const floorAtlas = scene.textures.get('floor_atlas');
    const floorTiler = new Autotiler(map, TILE.FLOOR, floorAtlas);
    floorTiler.applyToScene(scene, tileSize);
    
    // Apply autotiling for walls
    const wallAtlas = scene.textures.get('wall_atlas');
    const wallTiler = new Autotiler(map, TILE.WALL, wallAtlas);
    wallTiler.applyToScene(scene, tileSize);
  });
  
  scene.load.start();
}
```

## Advanced Techniques

### Wang Tiles for Variation

To avoid repetitive patterns, use **Wang tiles** - each tile type has multiple visual variants that are selected based on a hash or noise function:

```typescript
function selectVariant(tx: number, ty: number, variantCount: number): number {
  // Use tile position to deterministically select variant
  const hash = (tx * 73856093) ^ (ty * 19349663);
  return Math.abs(hash) % variantCount;
}
```

Apply variants to floor tiles:
```typescript
const floorVariants = [
  'floor_1', 'floor_2', 'floor_3', 'floor_4', 
  'floor_5', 'floor_6', 'floor_7', 'floor_8'
];

const variant = floorVariants[selectVariant(tx, ty, floorVariants.length)];
```

### Blob Tileset (47-Tile Full)

For maximum smoothness, use a **47-tile blob tileset** that handles all possible configurations including:
- 4 isolated tiles (single pixel)
- 4 endcaps (one connection)
- 8 corners (two adjacent)
- 4 straights (two opposite)
- 12 T-junctions (three connections)
- 15 full centers with inner corners (four connections)

The 0x72 tileset provides a subset of these in the atlases.

### Dual-Grid System

For ultra-smooth transitions, place tiles at grid **intersections** rather than on grid cells. This allows walls and floors to blend seamlessly.

```
Traditional Grid:        Dual Grid:
┌───┬───┬───┐           •───•───•───•
│ W │ W │ W │           │ \ │ / │ / │
├───┼───┼───┤           •───+───+───•
│ F │ F │ F │           │ F │ F │ F │
└───┴───┴───┘           •───•───•───•
```

In dual-grid, the tile at position `(x, y)` influences **four** surrounding cells.

## Performance Optimization

### Pre-compute Masks

For static maps, calculate all bitmasks once during map load:

```typescript
const maskCache: number[][] = [];
for (let y = 0; y < map.length; y++) {
  maskCache[y] = [];
  for (let x = 0; x < map[0].length; x++) {
    maskCache[y][x] = getMask(x, y);
  }
}
```

### Lazy Tile Creation

Only create sprites for tiles within the camera viewport + buffer:

```typescript
function updateVisibleTiles(camera: Phaser.Cameras.Scene2D.Camera) {
  const bufferTiles = 2;
  const startX = Math.max(0, Math.floor(camera.scrollX / tileSize) - bufferTiles);
  const endX = Math.min(cols, Math.ceil((camera.scrollX + camera.width) / tileSize) + bufferTiles);
  // ... create only visible tiles
}
```

## References

- [Godot Autotiling (3x3 minimal)](https://github.com/godotengine/godot-docs/issues/3316)
- [Blob Tileset Tutorial](https://code.tutsplus.com/how-to-use-tile-bitmasking-to-auto-tile-your-level-layouts--cms-25605t)
- [Wang Tiles for Procedural Generation](https://en.wikipedia.org/wiki/Wang_tile)

## Next Steps

- See [Tile Catalog](./tile-catalog.md) for complete tile reference
- See [BSP Room Stamps](./bsp-room-stamps.md) for autotiled prefab rooms
- Try the [Interactive Autotile Demo](../../scratch/autotile-demo.html)
