# Tile System - Complete Documentation

Master index for the 0x72 Dungeon Tileset II integration and tile research.

## 📚 Core Documentation

### 1. [Tile Catalog](./engineering/tile-catalog.md)
Complete reference for all 400+ tiles in the 0x72 Dungeon Tileset II v1.7.

**What's Inside:**
- Floor tiles (8 variants with autotiling support)
- Wall tiles (low 16x16 and high 16x32 for pseudo-3D)
- Props & objects (columns, containers, buttons, levers)
- Items & pickups (potions, coins, weapons)
- Weapon sprites (40+ types: swords, axes, bows, staves)
- UI elements (hearts, indicators)
- Complete usage tags for filtering

**Use When:** You need to know which tile to use for a specific purpose, or want to browse available assets.

---

### 2. [Autotiling Guide](./engineering/autotiling.md)
Implementation guide for the 3x3 minimal autotiling system used by 0x72 tileset.

**What's Inside:**
- Bitmask pattern explanation (8-neighbor checking)
- Complete TypeScript implementation
- Tile selection algorithm with code samples
- Advanced techniques:
  - Wang tiles for variation
  - Blob tileset (47-tile full)
  - Dual-grid system for ultra-smooth transitions
- Performance optimization strategies

**Use When:** Implementing or debugging the autotiling system in map generation.

---

### 3. [Character & Monster Sprites](./engineering/character-sprites.md)
Full sprite dictionary with animation frames and behavior notes.

**What's Inside:**
- **Player Characters** (10 types):
  - Knight, Wizard, Elf, Dwarf, Lizardfolk (male & female)
  - 16x28 pixels with idle, run, hit animations
- **Small Monsters** (16x16):
  - Goblin, Imp, Zombies, Slugs, Elementals
- **Medium Humanoids** (16x23-28):
  - Orcs, Skeletons, Necromancers, NPCs
- **Large Monsters** (32x36):
  - Big Demon, Big Zombie, Ogre
- Animation frame rates and Phaser integration
- Character selection matrix (roles, stats)

**Use When:** Adding new characters, creatures, or setting up animations.

---

### 4. [BSP Room Stamps](./engineering/bsp-room-stamps.md)
Prefab room templates for procedural BSP dungeons.

**What's Inside:**
- **Basic Rooms**: Empty rectangles (small, medium, large)
- **Functional Rooms**: Treasure vaults, trap rooms, shrines, fountains
- **Combat Rooms**: Arenas, ambush zones, chokepoints
- **Environmental**: Water pools, pits, decorated halls
- **Special Types**: Libraries, barracks, prisons, cells
- YAML stamp format specification
- Integration code for BSP generator
- Advanced techniques (rotation, mutation, chaining)

**Use When:** Designing new room types or integrating stamps into map generation.

---

## 🛠️ Interactive Tools

### [Tile Showcase - Interactive](../scratch/tile-showcase-interactive.html)
Web-based developer tool for browsing and testing tiles.

**Features:**
- 🔍 Searchable tile browser with tag filters
- 🎬 Character animation viewer (idle, run, hit)
- 🎨 Interactive autotiling paint demo
- 🏰 BSP room stamp visualizer
- ⚡ Real-time filtering and preview

**Launch:** Open in browser (no build required)

### [Tile Showcase - Static](../tile-showcase.html)
Auto-generated HTML catalog of all assets (reference only).

---

## 🚀 Quick Start Examples

### Example 1: Load and Render Tiles with Autotiling

```typescript
import { Autotiler } from '@/systems/autotiler';
import { TILE } from '@/config';

function setupMap(scene: Phaser.Scene, map: number[][]) {
  const tileSize = 48;
  
  // Load atlases
  scene.load.image('floor_atlas', 'assets/vendor/0x72_dungeon/0x72_DungeonTilesetII_v1.7/atlas_floor-16x16.png');
  scene.load.image('wall_atlas', 'assets/vendor/0x72_dungeon/0x72_DungeonTilesetII_v1.7/atlas_walls_low-16x16.png');
  
  scene.load.once('complete', () => {
    // Apply autotiling for floors
    const floorTiler = new Autotiler(map, TILE.FLOOR, scene.textures.get('floor_atlas'));
    floorTiler.applyToScene(scene, tileSize);
    
    // Apply autotiling for walls
    const wallTiler = new Autotiler(map, TILE.WALL, scene.textures.get('wall_atlas'));
    wallTiler.applyToScene(scene, tileSize);
  });
  
  scene.load.start();
}
```

### Example 2: Create Animated Character

```typescript
import { getCharFrame } from '@/sprites';

function createCharacter(scene: Phaser.Scene, type: string, x: number, y: number) {
  // Create sprite
  const [atlas, frame] = getCharFrame(type, 'idle', 0);
  const sprite = scene.add.sprite(x, y, atlas, frame);
  
  // Setup animations
  scene.anims.create({
    key: `${type}_idle`,
    frames: [
      { key: atlas, frame: getCharFrame(type, 'idle', 0)[1] },
      { key: atlas, frame: getCharFrame(type, 'idle', 1)[1] },
      { key: atlas, frame: getCharFrame(type, 'idle', 2)[1] },
      { key: atlas, frame: getCharFrame(type, 'idle', 3)[1] },
    ],
    frameRate: 8,
    repeat: -1,
  });
  
  scene.anims.create({
    key: `${type}_run`,
    frames: [
      { key: atlas, frame: getCharFrame(type, 'run', 0)[1] },
      { key: atlas, frame: getCharFrame(type, 'run', 1)[1] },
      { key: atlas, frame: getCharFrame(type, 'run', 2)[1] },
      { key: atlas, frame: getCharFrame(type, 'run', 3)[1] },
    ],
    frameRate: 14,
    repeat: -1,
  });
  
  sprite.play(`${type}_idle`);
  return sprite;
}

// Usage
const knight = createCharacter(scene, 'knight_f', 100, 100);
knight.play('knight_f_run'); // Switch to running
```

### Example 3: Apply Room Stamp to BSP Room

```typescript
import { loadStamp, applyStampToRoom } from '@/systems/stamps';

function decorateBSPRooms(map: number[][], rooms: Room[]) {
  // Treasure room in a dead-end
  const deadEndRoom = rooms.find(r => r.connections.length === 1);
  if (deadEndRoom) {
    const treasureStamp = loadStamp('treasure_pillars');
    applyStampToRoom(map, deadEndRoom, treasureStamp);
  }
  
  // Boss arena in largest room
  const largestRoom = rooms.sort((a, b) => 
    (b.width * b.height) - (a.width * a.height)
  )[0];
  const bossStamp = loadStamp('arena_pillared');
  applyStampToRoom(map, largestRoom, bossStamp);
  
  // Random shrines in medium rooms
  rooms
    .filter(r => r.width >= 7 && r.width <= 9)
    .slice(0, 2)
    .forEach(room => {
      const shrineStamp = loadStamp('shrine_small');
      applyStampToRoom(map, room, shrineStamp);
    });
}
```

---

## 📂 File Organization

```
public/assets/vendor/0x72_dungeon/
├── 0x72_DungeonTilesetII_v1.7/
│   ├── 0x72_DungeonTilesetII_v1.7.png      # Master atlas
│   ├── atlas_floor-16x16.png               # Floor autotile atlas
│   ├── atlas_walls_low-16x16.png           # Wall autotile atlas (16x16)
│   ├── atlas_walls_high-16x32.png          # Wall autotile atlas (16x32)
│   ├── tile_list_v1.7                      # Frame coordinates
│   ├── README                              # 3x3 autotiling reference
│   └── frames/                             # Individual tile PNGs
│       ├── floor_1.png ... floor_8.png
│       ├── wall_*.png
│       ├── knight_f_idle_anim_f0.png
│       ├── goblin_idle_anim_f0.png
│       └── ... (400+ files)
├── 0x72_DungeonTilesetII_sewers_v0.3/      # Sewers extension
└── 0x72_dungeon.json                       # Sprite manifest

docs/engineering/
├── tile-catalog.md                         # This index
├── autotiling.md                           # Autotiling system
├── character-sprites.md                    # Character reference
└── bsp-room-stamps.md                      # Room templates

docs/ideas/
└── tilemap-research.md                     # Original research notes

scratch/
└── tile-showcase-interactive.html          # Interactive tool
```

---

## 🎯 Implementation Roadmap

### ✅ Phase 1: Documentation (Complete)
- [x] Tile catalog with complete reference
- [x] Autotiling algorithm documentation
- [x] Character sprite dictionary
- [x] Room stamp templates
- [x] Interactive showcase tool

### 🚧 Phase 2: Core Integration (In Progress)
- [ ] Integrate autotiler into `src/mapgen.ts`
- [ ] Create stamp loader for BSP generator
- [ ] Generate Phaser atlas JSON from tile_list_v1.7
- [ ] Update `src/sprites.ts` with atlas support
- [ ] Add floor/wall variant selection (Wang tiles)

### 📋 Phase 3: Advanced Features (Planned)
- [ ] Dual-grid rendering system
- [ ] Dynamic stamp mutation (rotate, mirror, scale)
- [ ] Contextual stamp selection AI
- [ ] Procedural decoration pass
- [ ] Lighting integration with wall depth
- [ ] Parallax scrolling for depth layers

### 🔮 Phase 4: Content Expansion (Future)
- [ ] Custom stamp library per world
- [ ] Themed tilesets (sewers, forest, castle)
- [ ] Animated environmental effects
- [ ] Weather overlays (rain, fog, snow)
- [ ] Destructible terrain

---

## 🔗 Related Documentation

- [Architecture](./engineering/architecture.md) - Overall system design
- [Map Generation](./ideas/world-generation.md) - BSP and procedural systems
- [Sprites](./engineering/sprites.md) - Sprite loading and animation
- [Modding Guide](./modding/README.md) - Creating custom content

---

## 📊 Tile Statistics

**0x72 Dungeon Tileset II v1.7:**
- **Total Assets**: 417 files
- **Floor Variants**: 8 base + autotile frames
- **Wall Pieces**: 47 unique configurations
- **Character Sprites**: 20+ types (male/female variants)
- **Monster Types**: 25+ creatures
- **Weapons**: 40+ weapon sprites
- **Props & Objects**: 50+ interactive elements
- **Animation Frames**: 1000+ total frames

**Coverage:**
- ✅ Dungeon environments (stone, brick)
- ✅ Character classes (knight, wizard, ranger, etc.)
- ✅ Common monsters (goblin, zombie, demon, etc.)
- ✅ Weapons (swords, axes, bows, magic staves)
- ✅ Props (chests, doors, torches, columns)
- ⚠️ Limited: outdoor environments (grass, trees)
- ⚠️ Limited: modern/sci-fi themes
- ❌ Missing: water transitions, cliff edges

---

## 🐛 Known Issues & Limitations

1. **Autotiling Edge Cases**
   - Single-tile islands may render incorrectly
   - **Fix**: Post-process with connectivity check

2. **Animation Frame Gaps**
   - Some creatures missing hit animations
   - **Workaround**: Use idle frame 0 as hit frame

3. **Weapon Alignment**
   - Weapons need manual Y-offset per character
   - **Workaround**: Store offsets in character metadata

4. **Atlas Loading**
   - No pre-generated Phaser atlas JSON
   - **Workaround**: Generate from tile_list_v1.7 at build time

---

## 💡 Best Practices

### Performance
- Pre-compute bitmasks for static maps
- Use texture atlases instead of individual files
- Lazy-load tiles outside viewport + buffer
- Pool animated sprites

### Visual Quality
- Layer rendering: floor → shadows → entities → walls → overlays
- Apply Y-offset (-8px) to high walls for depth
- Use floor variants with Perlin noise for organic look
- Add particle effects for torches and fountains

### Content Creation
- Design stamps in multiples of grid size (16px)
- Tag stamps thoroughly for filtering
- Test stamps in isolation before BSP integration
- Document entity spawn probabilities

---

## 📞 Support & Contribution

- **Questions**: Check the docs first, then ask in Discord
- **Bug Reports**: File issue with screenshot + console logs
- **New Stamps**: Submit YAML + preview image
- **Tile Requests**: Check 0x72 extensions on itch.io first

---

**Last Updated**: 2026-04-23  
**Tileset Version**: 0x72 Dungeon Tileset II v1.7  
**Documentation Version**: 1.0
