# Idea: Beautiful Tilemap for BSP Auto-Generated Maps

## Overview
This research focuses on transforming standard Binary Space Partitioning (BSP) generated layouts into visually stunning, professional-grade tilemaps. Standard BSP maps often feel clinical or repetitive; this research explores techniques to add "soul," variety, and high-fidelity aesthetics.

## Key Research Areas

### 1. Advanced Autotiling (The Foundation)
To achieve "beautiful" transitions, we need more than simple 4-neighbor checks.
- **Blob Tileset (47-tile bitmasking)**: Implementing a complete tileset that handles inner and outer corners, preventing "grid-like" jagged edges.
- **Wang Tiles**: Researching non-deterministic tile placement to avoid repetitive patterns in large floor areas.
- **Dual-Grid System**: Exploring the "Dual Grid" approach where tiles are placed on the intersections of the logical grid, allowing for much smoother transitions between different terrain types.

### 2. Aesthetic Polishing Techniques
- **Depth and Layering**:
    - **Wall Height**: Using multi-tile wall heights with tops/bottoms to create a pseudo-3D perspective.
    - **Drop Shadows**: Implementing semi-transparent shadow tiles at the base of walls to "ground" the entities in the world.
    - **Edge Decorations**: Auto-placing "clutter" (cracks, moss, debris) along wall edges where they meet the floor.
- **Variant Selection**:
    - Using weighted random or Perlin noise to select between multiple versions of the same tile (e.g., a "clean" brick vs. a "cracked" brick).

### 3. BSP-Specific Enhancements
- **Room Morphing**: Instead of rigid rectangles, researching "jittering" or "cellular automata" passes on the BSP rooms to make them feel more organic.
- **Themed Zoning**: Mapping different BSP leaf nodes to different "biomes" or "room types" within the same dungeon, each with its own tileset and decorative rules.
- **Corridor Blending**: Techniques for making corridors feel like natural extensions of rooms rather than just narrow connecting lines.

### 4. Technical Implementation Concepts
- **Rule-Based Mapping**: Creating a JSON-driven "Rule Engine" where we can define: "If Wall is surrounded by Floor on the South, use Bottom-Edge-Tile-A".
- **Post-Generation Decorator Pass**: A separate algorithm that runs after the BSP layout is finalized to "paint" the beauty onto the raw data.

## Resources to Research
The following tilesets and extensions have been identified for high-fidelity tilemap research:

### Base & Extensions (0x72)
- [Dungeon Tileset II (Base)](https://0x72.itch.io/dungeontileset-ii)
- [Dungeon Tileset II: Sewers Extension](0x72_DungeonTilesetII_sewers_v0.3.zip)
- [Stairs Extension](https://keymaster777.itch.io/0x72-dungeon-tileset-2-stairs-extension)
- [Extended Set](https://nijikokun.itch.io/dungeontileset-ii-extended)

### Add-ons & Alternatives
- **Autotiling focus**: [16x16 Dungeon Autotile Remix](https://safwyl.itch.io/16x16-dungeon-autotile-remix), [Dungeon Walls Reconfig](https://aekae13.itch.io/16x16-dungeon-walls-reconfig)
- **Biomes**: [Enchanted Forest](https://superdark.itch.io/enchanted-forest-characters), [Smooth Dungeon](https://efetusder.itch.io/smooth-dungeon-tileset)
- **Props & Assets**: [CR Tileset](https://anritool.itch.io/cr-tileset), [Custom Dungeon 16x16](https://omniboy.itch.io/custom-dungeon-16x16-tileset), [Halloween Characters](https://opengameart.org/content/halloween-characters)

## Organization Plan
Assets should be organized in `public/assets/vendor/` to keep third-party content separate from core game logic:
- `public/assets/vendor/0x72_dungeon/`: For the main 0x72 ecosystem.
- `public/assets/vendor/extensions/`: For individual itch.io add-ons and variants.

## Goal
The ultimate goal is to create a system where a single "Seed" produces a map that looks hand-crafted, with smooth transitions, depth, and environmental storytelling.

## Documentation & Tools

### Complete Reference Documentation
The following comprehensive guides have been created:

1. **[Tile Catalog](../engineering/tile-catalog.md)** - Complete reference for all tiles in the 0x72 Dungeon Tileset II
   - Floor tiles (8 variants with autotiling)
   - Wall tiles (low 16x16 and high 16x32)
   - Props, decorations, containers
   - Weapons and items
   - Organized by usage tags

2. **[Autotiling Guide](../engineering/autotiling.md)** - 3x3 minimal autotiling system
   - Bitmask pattern explanation
   - 8-neighbor checking algorithm
   - Tile selection code (TypeScript)
   - Advanced techniques (Wang tiles, blob tilesets, dual-grid)
   - Performance optimization

3. **[Character & Monster Sprites](../engineering/character-sprites.md)** - Full sprite dictionary
   - Player character classes (10 types: Knight, Wizard, Elf, Dwarf, Lizardfolk - both genders)
   - Small monsters (16x16): Goblin, Imp, Zombie variants, Slugs, Elementals
   - Medium humanoids (16x23-28): Orcs, Skeletons, NPCs
   - Large monsters (32x36): Big Demon, Big Zombie
   - Animation frame structure (idle, run, hit)
   - Phaser integration examples

4. **[BSP Room Stamps](../engineering/bsp-room-stamps.md)** - Prefab room templates
   - Basic empty rooms (small, medium, large)
   - Functional rooms (treasure, traps, shrines)
   - Combat-oriented (arenas, ambush, chokepoints)
   - Environmental (water, pits, decorated halls)
   - Special types (library, barracks, prison)
   - Integration with BSP generator code

### Interactive Tools

**[Tile Showcase - Interactive](../../scratch/tile-showcase-interactive.html)** - Developer tool with:
- Searchable tile browser with tag filters
- Character animation viewer
- Interactive autotiling paint demo
- BSP room stamp visualizer
- Real-time filtering and preview

**[Tile Showcase - Static](../../tile-showcase.html)** - Auto-generated catalog (sample reference)

## Implementation Status

### ✅ Completed
- Tile catalog and classification system
- Autotiling algorithm documentation
- Character sprite reference
- Room stamp template library
- Interactive showcase tool

### 🚧 In Progress
- Autotiling integration into `src/game.ts`
- Room stamp loader for BSP generator
- Atlas JSON generation for Phaser
- Variant selection system (Wang tiles)

### 📋 Planned
- Blob tileset expansion (47-tile full)
- Dual-grid rendering system
- Dynamic stamp mutation (rotation, mirroring)
- Contextual stamp selection AI
- Procedural decoration pass

## Quick Start Guide

### Using Autotiling

```typescript
import { Autotiler } from './autotiler';

// In your map generator
const map = generateBSPMap(width, height);
const tileSize = 48;

// Load floor and wall atlases
scene.load.image('floor_atlas', 'assets/atlas_floor-16x16.png');
scene.load.image('wall_atlas', 'assets/atlas_walls_low-16x16.png');

scene.load.once('complete', () => {
  // Apply autotiling
  const floorTiler = new Autotiler(map, TILE.FLOOR, scene.textures.get('floor_atlas'));
  floorTiler.applyToScene(scene, tileSize);
  
  const wallTiler = new Autotiler(map, TILE.WALL, scene.textures.get('wall_atlas'));
  wallTiler.applyToScene(scene, tileSize);
});
```

### Using Room Stamps

```typescript
import { loadStamp, applyStamp } from './stamps';

// After BSP room generation
const room = bspRooms[0]; // First room
const stamp = loadStamp('treasure_pillars');

if (room.width >= stamp.width && room.height >= stamp.height) {
  applyStamp(map, room, stamp);
}
```

### Creating Character Sprites

```typescript
// Load character from atlas
const knight = scene.add.sprite(x, y, 'knight_f_idle_anim_f0');

// Create animations
scene.anims.create({
  key: 'knight_f_idle',
  frames: scene.anims.generateFrameNames('atlas', {
    prefix: 'knight_f_idle_anim_f',
    start: 0,
    end: 3
  }),
  frameRate: 8,
  repeat: -1
});

knight.play('knight_f_idle');
```

## References & Inspiration
- [The Dual Grid System](https://github.com/miziziziz/DualGridTilemapSystem)
- [Procedural Dungeon Generation: BSP](https://eskerda.com/bsp-dungeon-generation/)
- [Tileset Bitmasking (Blob Tiles)](https://code.tutsplus.com/how-to-use-tile-bitmasking-to-auto-tile-your-level-layouts--cms-25605t)
- [Godot 3x3 Minimal Autotiling](https://github.com/godotengine/godot-docs/issues/3316)
