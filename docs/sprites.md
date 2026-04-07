# Sprite & Asset Documentation

## Overview

The game uses a hybrid sprite approach:
- **Procedural sprites** (current, `js/sprites.js`) as fallback for any missing art
- **External art packs** for higher quality visuals — loaded via Phaser's asset pipeline

All sprites display at **48×48px** regardless of source resolution (via Phaser `setDisplaySize(S, S)`).

---

## Asset Packs

### 1. Tiny 16 — Animated Characters (Primary)
- **Author**: Lanea Zimmerman (Sharm)
- **License**: CC-BY 4.0 — **must credit** Lanea Zimmerman
- **Source**: https://opengameart.org/content/tiny-16-basic
- **Resolution**: 16×16 (scaled to 48×48 in-game)
- **Content**: Characters with 2-frame walk cycle × 4 directions, monsters, items, tiles
- **Style**: Pokemon / Dragon Warrior chibi pixel art
- **Files**:
  - `assets/characters/characters.png` — Character + monster spritesheet
  - `assets/tiles/basictiles.png` — Dungeon/overworld tiles
  - `assets/items/things.png` — Item sprites

### 2. DENZI CC0 — Japanese Pixel Art (Items/Icons)
- **Author**: DENZI (Japanese pixel artist)
- **License**: CC0 (public domain) — no attribution required
- **Source**: https://opengameart.org/content/denzis-public-domain-art
- **Resolution**: 32×32 (scaled to 48×48 in-game)
- **Content**: 1,000+ sprites — dungeon tiles, monsters, items, ability icons, equipment overlays
- **Style**: Classic JRPG / roguelike (3/4 overhead orthographic)
- **Files**:
  - `assets/items/DENZI_CC0_32x32_tileset.png` — Full tileset
  - `assets/items/DENZI_CC0_individual_organized_tiles_sprites/` — Individual PNGs by category

### 3. DCSS — Dungeon Crawl Stone Soup (Supplement)
- **Author**: Various (collaborative, includes DENZI work)
- **License**: CC0 (public domain)
- **Source**: https://opengameart.org/content/dungeon-crawl-32x32-tiles-supplemental
- **Resolution**: 32×32
- **Content**: 6,000+ tiles — terrain, monsters, items, GUI elements, player avatars, spell effects
- **Files**:
  - `assets/dcss/` — Organized by category (monster/, item/, dungeon/, player/, etc.)

### 4. CobraLad Portraits — Character Faces
- **Author**: CobraLad
- **License**: CC-BY 3.0 — **must credit** CobraLad
- **Source**: https://opengameart.org/content/32x32-fantasy-portrait-set
- **Resolution**: 32×32
- **Content**: 14 fantasy character face portraits (knight, mage, skeleton, dwarf, elf, etc.)
- **Files**:
  - `assets/portraits/portraits.png` — Portrait spritesheet

---

## Sprite Mapping

### Tile Textures

| Texture Key | Description | Current Source | New Source | Pack |
|-------------|-------------|---------------|-----------|------|
| `t_floor` | Dungeon floor | Procedural (dark blue) | Stone floor tile | Tiny16/DENZI |
| `t_wall` | Dungeon wall | Procedural (purple) | Stone wall | Tiny16/DENZI |
| `t_door` | Closed door | Procedural (brown rect) | Wooden door | DENZI |
| `t_door_open` | Open door | Procedural (outline) | Open doorway | DENZI |
| `t_chest` | Closed chest | Procedural (brown box) | Treasure chest | DENZI |
| `t_chest_open` | Open chest | Procedural (open box) | Open chest | DENZI |
| `t_stairs` | Staircase | Procedural (steps+arrow) | Staircase tile | DENZI |
| `t_water` | Water tile | Procedural (dark blue) | Water tile | Tiny16 |
| `t_grass` | Grass tile | Procedural (green) | Grass tile | Tiny16 |
| `t_move` | Movement range overlay | Procedural (blue tint) | Keep procedural | — |
| `t_atk` | Attack range overlay | Procedural (red tint) | Keep procedural | — |
| `t_tap` | Tap/selection indicator | Procedural (gold border) | Keep procedural | — |
| `t_turn` | Active turn indicator | Procedural (gold glow) | Keep procedural | — |
| `deco_torch` | Torch decoration | Procedural | Torch sprite | DENZI |
| `deco_banner` | Banner decoration | Procedural | Banner sprite | DENZI |
| `deco_crystal` | Crystal decoration | Procedural | Crystal sprite | DENZI |

### Character Sprites

Each character has 5 animation frames: `idle`, `walk1`, `walk2`, `run`, `blink`

| Sprite Key Pattern | Description | Current Source | New Source | Pack |
|-------------------|-------------|---------------|-----------|------|
| `spr_player_*` | Player (fighter) | Procedural blue humanoid | Knight character | Tiny16 |
| `spr_goblin_*` | Goblin enemy | Procedural green humanoid | Goblin character | Tiny16 |
| `spr_skeleton_*` | Skeleton enemy | Procedural skeleton | Skeleton character | Tiny16 |
| `spr_orc_*` | Orc enemy | Procedural brown humanoid | Orc/large monster | Tiny16 |

Animation keys: `anim_{type}_idle`, `anim_{type}_walk`, `anim_{type}_run`

### Portraits (Side Panel + Dialog + Initiative)

| Key | Description | Current Source | New Source | Pack |
|-----|-------------|---------------|-----------|------|
| `portrait_player` | Player face | Emoji 🧝 | Knight portrait | CobraLad |
| `portrait_goblin` | Goblin face | Emoji 👺 | Monster portrait | CobraLad/DCSS |
| `portrait_skeleton` | Skeleton face | Emoji 💀 | Skeleton portrait | CobraLad |
| `portrait_orc` | Orc face | Emoji 👹 | Monster portrait | DCSS |

### Item Icons (Inventory + Hotbar + Loot)

| Key | Description | Current Source | New Source | Pack |
|-----|-------------|---------------|-----------|------|
| `item_potion_heal` | Healing Potion | Emoji 🧪 | Red potion | DENZI |
| `item_potion_str` | Strength Potion | Emoji 🧪 | Blue potion | DENZI |
| `item_potion_invis` | Invisibility Potion | Emoji 🧪 | Clear potion | DENZI |
| `item_scroll_shield` | Scroll of Shield | Emoji 📜 | Scroll sprite | DENZI |
| `item_scroll_fireball` | Scroll of Fireball | Emoji 📜 | Fire scroll | DENZI |
| `item_longsword` | Longsword | No visual | Longsword | DENZI |
| `item_shortsword` | Shortsword | No visual | Shortsword | DENZI |
| `item_scimitar` | Scimitar | No visual | Curved sword | DENZI |
| `item_greataxe` | Greataxe | No visual | Large axe | DENZI |
| `item_dagger` | Dagger | No visual | Dagger | DENZI |
| `item_shield` | Shield | Emoji 🛡️ | Shield | DENZI |
| `item_ring` | Ring | Emoji 💍 | Ring | DENZI |
| `item_amulet` | Amulet | Emoji 📿 | Amulet/necklace | DENZI |
| `item_armor_leather` | Leather Armor | No visual | Leather armor | DENZI |
| `item_armor_chain` | Chain Mail | No visual | Chain armor | DENZI |
| `item_gold` | Gold pile | No visual | Gold coins | DENZI |
| `item_gem_quartz` | Quartz Gem | Emoji 💎 | White gem | DENZI |
| `item_gem_ruby` | Ruby | Emoji 💎 | Red gem | DENZI |
| `item_gem_diamond` | Diamond | Emoji 💎 | Clear gem | DENZI |
| `item_key` | Key item | Emoji 🔑 | Key sprite | DENZI |
| `item_lockpick` | Thieves' Tools | Emoji 🔧 | Lockpick set | DENZI |
| `item_ration` | Rations | Emoji 🍖 | Food/bread | DENZI |
| `item_torch` | Torch bundle | Emoji 🔥 | Torch sprite | DENZI |
| `item_arrow` | Arrow bundle | Emoji 🏹 | Arrow quiver | DENZI |

### Ability Icons (Hotbar)

| Key | Description | Current Source | New Source | Pack |
|-----|-------------|---------------|-----------|------|
| `icon_attack` | Basic Attack | Emoji ⚔️ | Sword swing icon | DENZI |
| `icon_dash` | Dash action | Emoji 💨 | Boot/wind icon | DENZI |
| `icon_hide` | Hide action | Emoji 🕶 | Cloak/shadow icon | DENZI |
| `icon_flee` | Flee action | Emoji 🏳 | Running figure | DENZI |
| `icon_sleep_cloud` | Sleep Cloud | Emoji 🌫 | Cloud/sleep icon | DENZI |
| `icon_second_wind` | Second Wind | No icon | Heart/heal icon | DENZI |
| `icon_action_surge` | Action Surge | No icon | Lightning icon | DENZI |
| `icon_poison_strike` | Poison Strike | No icon | Poison blade icon | DENZI |
| `icon_dodge` | Dodge action | No icon | Shield/evade icon | DENZI |
| `icon_help` | Help action | No icon | Handshake icon | DENZI |
| `icon_disengage` | Disengage | No icon | Retreat icon | DENZI |

### Status Effect Icons

| Key | Description | Current Source | New Source | Pack |
|-----|-------------|---------------|-----------|------|
| `status_poisoned` | Poisoned | Text only | Poison drop icon | DENZI |
| `status_sleep` | Sleep | Text only | Zzz icon | DENZI |
| `status_burning` | Burning | Text only | Fire icon | DENZI |

### UI Elements

| Key | Description | New Source | Pack |
|-----|-------------|-----------|------|
| `ui_hotbar_slot` | Empty hotbar slot background | Custom or DENZI UI | DENZI |
| `ui_hotbar_slot_active` | Selected slot border/glow | Custom | — |
| `ui_tab_active` | Active tab indicator | Custom | — |
| `ui_panel_bg` | Side panel background texture | Custom | — |

---

## Folder Structure

```
assets/
├── portraits/           # Character face portraits (32×32)
│   └── portraits.png    # CobraLad spritesheet
├── characters/          # Animated character spritesheets (16×16)
│   ├── characters.png   # Tiny16 characters + monsters
│   └── dead.png         # Tiny16 death sprites
├── items/               # Item icons (32×32)
│   ├── things.png       # Tiny16 items
│   ├── DENZI_CC0_32x32_tileset.png
│   └── organized/       # DENZI individual PNGs by category
│       ├── weapons/
│       ├── armor/
│       ├── potions/
│       ├── scrolls/
│       ├── gems/
│       ├── rings/
│       └── misc/
├── tiles/               # Dungeon tiles (16×16 or 32×32)
│   └── basictiles.png   # Tiny16 tiles
├── dcss/                # DCSS supplemental (32×32, organized by folder)
│   ├── monster/
│   ├── item/
│   ├── dungeon/
│   ├── player/
│   └── gui/
└── ui/                  # UI elements
    ├── hotbar_frame.png
    └── panel_bg.png
```

---

## Loading Strategy

### Phaser Preload Phase
```javascript
// In GameScene.preload():
// 1. Load sprite atlases for animated characters
this.load.spritesheet('tiny16_chars', 'assets/characters/characters.png', { frameWidth: 16, frameHeight: 16 });

// 2. Load individual item/icon sprites from DENZI organized folders
this.load.image('item_potion_heal', 'assets/items/organized/potions/red_potion.png');

// 3. Load portrait spritesheet
this.load.spritesheet('portraits', 'assets/portraits/portraits.png', { frameWidth: 32, frameHeight: 32 });

// 4. Load tile textures
this.load.spritesheet('tiny16_tiles', 'assets/tiles/basictiles.png', { frameWidth: 16, frameHeight: 16 });
```

### Fallback System
```javascript
// If external sprite not loaded, fall back to procedural
function getTexture(key) {
  if (scene.textures.exists(key)) return key;
  // Map to procedural fallback
  const fallbacks = {
    'item_potion_heal': null,  // Use emoji
    'spr_player_idle': 'spr_player_idle',  // Procedural exists
  };
  return fallbacks[key] || null;
}
```

### Scaling
- **16×16 sprites** (Tiny16): Phaser `setDisplaySize(48, 48)` — 3× scale, nearest-neighbor for pixel-crisp look
- **32×32 sprites** (DENZI/DCSS): Phaser `setDisplaySize(48, 48)` — 1.5× scale
- **Set Phaser pixel art mode**: `pixelArt: true` in game config for sharp scaling

---

## Attribution (Required)

Include in game credits / README:
```
Character sprites: "Tiny 16: Basic" by Lanea Zimmerman (Sharm), CC-BY 4.0
  https://opengameart.org/content/tiny-16-basic

Character portraits: "32x32 Fantasy Portrait Set" by CobraLad, CC-BY 3.0
  https://opengameart.org/content/32x32-fantasy-portrait-set

Item/tile art: "DENZI's public domain art" — CC0 (public domain)
  https://opengameart.org/content/denzis-public-domain-art

Supplemental tiles: "Dungeon Crawl Stone Soup" tiles — CC0 (public domain)
  https://opengameart.org/content/dungeon-crawl-32x32-tiles-supplemental
```
