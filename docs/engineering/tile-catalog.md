# Tile Catalog - 0x72 Dungeon Tileset II

Complete reference for all tiles in the 0x72 Dungeon Tileset II v1.7.

## Tileset Sources

- **Main Atlas**: `public/assets/vendor/0x72_dungeon/0x72_DungeonTilesetII_v1.7/0x72_DungeonTilesetII_v1.7.png`
- **Floor Atlas**: `atlas_floor-16x16.png` (48x80 grid, 3x3 minimal autotiling)
- **Low Walls Atlas**: `atlas_walls_low-16x16.png` (48x80 grid, 3x3 minimal autotiling)
- **High Walls Atlas**: `atlas_walls_high-16x32.png` (48x128 grid, for pseudo-3D depth)

## 1. Floor Tiles (16x16)

### Base Floor Variants
All floors use **3x3 minimal autotiling** (see [Autotiling Guide](./autotiling.md))

| Tile Name | Dimensions | Usage | Tags |
|-----------|-----------|-------|------|
| `floor_1` | 16x16 | Base dungeon stone floor | `floor`, `stone`, `base` |
| `floor_2` | 16x16 | Variant stone floor (darker) | `floor`, `stone`, `variant` |
| `floor_3` | 16x16 | Variant stone floor (cracked) | `floor`, `stone`, `worn` |
| `floor_4` | 16x16 | Variant stone floor (mossy) | `floor`, `stone`, `organic` |
| `floor_5` | 16x16 | Light stone floor | `floor`, `stone`, `light` |
| `floor_6` | 16x16 | Brick pattern floor | `floor`, `brick`, `decorative` |
| `floor_7` | 16x16 | Checkerboard floor | `floor`, `pattern`, `decorative` |
| `floor_8` | 16x16 | Smooth stone floor | `floor`, `stone`, `smooth` |

### Special Floor Tiles

| Tile Name | Dimensions | Usage | Tags |
|-----------|-----------|-------|------|
| `floor_ladder` | 16x16 | Ladder (up/down transition) | `floor`, `ladder`, `transition` |
| `floor_stairs` | 16x16 | Stairs to next level | `floor`, `stairs`, `transition`, `exit` |
| `floor_spikes_anim_f0-f3` | 16x16 | Animated spike trap (4 frames) | `floor`, `hazard`, `trap`, `animated` |
| `hole` | 16x16 | Pit/hole in floor | `floor`, `hazard`, `hole` |
| `edge_down` | 16x16 | Edge/cliff drop-off | `floor`, `edge`, `cliff` |

## 2. Wall Tiles (16x16 Low, 16x32 High)

### Wall Sections (Low 16x16)
Used for standard grid-based walls. Supports **3x3 minimal autotiling**.

| Tile Name | Dimensions | Usage | Tags |
|-----------|-----------|-------|------|
| `wall_mid` | 16x16 | Middle wall section | `wall`, `mid`, `base` |
| `wall_top_mid` | 16x16 | Top wall section (with edge) | `wall`, `top`, `edge` |
| `wall_left` | 16x16 | Left side wall | `wall`, `side`, `left` |
| `wall_right` | 16x16 | Right side wall | `wall`, `side`, `right` |
| `wall_top_left` | 16x16 | Top-left corner | `wall`, `corner`, `top-left` |
| `wall_top_right` | 16x16 | Top-right corner | `wall`, `corner`, `top-right` |

### Wall Outer Corners

| Tile Name | Dimensions | Usage | Tags |
|-----------|-----------|-------|------|
| `wall_outer_top_left` | 16x16 | Outer corner top-left | `wall`, `corner`, `outer`, `top-left` |
| `wall_outer_top_right` | 16x16 | Outer corner top-right | `wall`, `corner`, `outer`, `top-right` |
| `wall_outer_mid_left` | 16x16 | Outer mid-left | `wall`, `side`, `outer`, `left` |
| `wall_outer_mid_right` | 16x16 | Outer mid-right | `wall`, `side`, `outer`, `right` |
| `wall_outer_front_left` | 16x16 | Outer front-left | `wall`, `front`, `outer`, `left` |
| `wall_outer_front_right` | 16x16 | Outer front-right | `wall`, `front`, `outer`, `right` |

### Wall Edges (T-shapes)

| Tile Name | Dimensions | Usage | Tags |
|-----------|-----------|-------|------|
| `wall_edge_left` | 16x16 | Edge piece left | `wall`, `edge`, `left` |
| `wall_edge_right` | 16x16 | Edge piece right | `wall`, `edge`, `right` |
| `wall_edge_mid_left` | 16x16 | Mid edge left | `wall`, `edge`, `mid`, `left` |
| `wall_edge_mid_right` | 16x16 | Mid edge right | `wall`, `edge`, `mid`, `right` |
| `wall_edge_top_left` | 16x16 | Top edge left | `wall`, `edge`, `top`, `left` |
| `wall_edge_top_right` | 16x16 | Top edge right | `wall`, `edge`, `top`, `right` |
| `wall_edge_bottom_left` | 16x16 | Bottom edge left | `wall`, `edge`, `bottom`, `left` |
| `wall_edge_bottom_right` | 16x16 | Bottom edge right | `wall`, `edge`, `bottom`, `right` |
| `wall_edge_tshape_left` | 16x16 | T-junction left | `wall`, `junction`, `t-shape`, `left` |
| `wall_edge_tshape_right` | 16x16 | T-junction right | `wall`, `junction`, `t-shape`, `right` |
| `wall_edge_tshape_bottom_left` | 16x16 | T-junction bottom-left | `wall`, `junction`, `t-shape`, `bottom-left` |
| `wall_edge_tshape_bottom_right` | 16x16 | T-junction bottom-right | `wall`, `junction`, `t-shape`, `bottom-right` |

### Wall Decorations

| Tile Name | Dimensions | Usage | Tags |
|-----------|-----------|-------|------|
| `wall_banner_blue` | 16x16 | Blue banner decoration | `wall`, `decoration`, `banner`, `blue` |
| `wall_banner_green` | 16x16 | Green banner decoration | `wall`, `decoration`, `banner`, `green` |
| `wall_banner_red` | 16x16 | Red banner decoration | `wall`, `decoration`, `banner`, `red` |
| `wall_banner_yellow` | 16x16 | Yellow banner decoration | `wall`, `decoration`, `banner`, `yellow` |
| `wall_goo` | 16x16 | Wall goo/slime | `wall`, `decoration`, `organic`, `goo` |
| `wall_goo_base` | 16x16 | Goo base/drip | `wall`, `decoration`, `organic`, `goo` |
| `wall_hole_1` | 16x16 | Wall hole (small damage) | `wall`, `decoration`, `damage`, `hole` |
| `wall_hole_2` | 16x16 | Wall hole (large damage) | `wall`, `decoration`, `damage`, `hole` |

### Wall Fountains (Animated)

| Tile Name | Dimensions | Usage | Tags |
|-----------|-----------|-------|------|
| `wall_fountain_top_1-3` | 16x16 | Fountain top (3 variants) | `wall`, `fountain`, `top`, `decoration` |
| `wall_fountain_mid_blue_anim_f0-f2` | 16x16 | Blue fountain mid (3 frames) | `wall`, `fountain`, `mid`, `animated`, `blue` |
| `wall_fountain_mid_red_anim_f0-f2` | 16x16 | Red fountain mid (3 frames) | `wall`, `fountain`, `mid`, `animated`, `red` |
| `wall_fountain_basin_blue_anim_f0-f2` | 16x16 | Blue fountain basin (3 frames) | `wall`, `fountain`, `basin`, `animated`, `blue` |
| `wall_fountain_basin_red_anim_f0-f2` | 16x16 | Red fountain basin (3 frames) | `wall`, `fountain`, `basin`, `animated`, `red` |

## 3. Doors

| Tile Name | Dimensions | Usage | Tags |
|-----------|-----------|-------|------|
| `doors_frame_left` | 16x16 | Door frame left side | `door`, `frame`, `left` |
| `doors_frame_right` | 16x16 | Door frame right side | `door`, `frame`, `right` |
| `doors_frame_top` | 16x16 | Door frame top | `door`, `frame`, `top` |
| `doors_leaf_closed` | 16x16 | Door leaf (closed state) | `door`, `leaf`, `closed`, `interactive` |
| `doors_leaf_open` | 16x16 | Door leaf (open state) | `door`, `leaf`, `open`, `interactive` |

## 4. Props & Objects

### Columns

| Tile Name | Dimensions | Usage | Tags |
|-----------|-----------|-------|------|
| `column` | 16x16 | Freestanding column | `prop`, `column`, `structure` |
| `column_wall` | 16x16 | Wall-mounted column | `prop`, `column`, `wall`, `decoration` |

### Containers

| Tile Name | Dimensions | Usage | Tags |
|-----------|-----------|-------|------|
| `chest_full_open_anim_f0-f2` | 16x16 | Full chest opening (3 frames) | `container`, `chest`, `loot`, `animated` |
| `chest_empty_open_anim_f0-f2` | 16x16 | Empty chest opening (3 frames) | `container`, `chest`, `empty`, `animated` |
| `chest_mimic_open_anim_f0-f2` | 16x16 | Mimic chest (enemy) (3 frames) | `container`, `chest`, `enemy`, `animated`, `trap` |
| `crate` | 16x24 | Wooden crate | `container`, `prop`, `crate`, `destructible` |

### Buttons & Levers

| Tile Name | Dimensions | Usage | Tags |
|-----------|-----------|-------|------|
| `button_blue_up` | 16x16 | Blue button (up/inactive) | `interactive`, `button`, `blue`, `inactive` |
| `button_blue_down` | 16x16 | Blue button (down/active) | `interactive`, `button`, `blue`, `active` |
| `button_red_up` | 16x16 | Red button (up/inactive) | `interactive`, `button`, `red`, `inactive` |
| `button_red_down` | 16x16 | Red button (down/active) | `interactive`, `button`, `red`, `active` |
| `lever_left` | 16x16 | Lever (left position) | `interactive`, `lever`, `left` |
| `lever_right` | 16x16 | Lever (right position) | `interactive`, `lever`, `right` |

### Items & Pickups

| Tile Name | Dimensions | Usage | Tags |
|-----------|-----------|-------|------|
| `coin_anim_f0-f3` | 6x7 | Gold coin (4 frames) | `item`, `coin`, `currency`, `animated` |
| `flask_big_red` | 16x16 | Large red potion | `item`, `potion`, `health`, `large` |
| `flask_big_blue` | 16x16 | Large blue potion | `item`, `potion`, `mana`, `large` |
| `flask_big_green` | 16x16 | Large green potion | `item`, `potion`, `poison`, `large` |
| `flask_big_yellow` | 16x16 | Large yellow potion | `item`, `potion`, `buff`, `large` |
| `flask_red` | 16x16 | Small red potion | `item`, `potion`, `health`, `small` |
| `flask_blue` | 16x16 | Small blue potion | `item`, `potion`, `mana`, `small` |
| `flask_green` | 16x16 | Small green potion | `item`, `potion`, `poison`, `small` |
| `flask_yellow` | 16x16 | Small yellow potion | `item`, `potion`, `buff`, `small` |
| `bomb_f0-f2` | 16x16 | Bomb (3 frames) | `item`, `bomb`, `explosive`, `animated` |
| `skull` | 16x16 | Skull decoration | `prop`, `decoration`, `skull`, `macabre` |

### UI Elements

| Tile Name | Dimensions | Usage | Tags |
|-----------|-----------|-------|------|
| `ui_heart_full` | 16x16 | Full heart (HP indicator) | `ui`, `health`, `heart`, `full` |
| `ui_heart_half` | 16x16 | Half heart (HP indicator) | `ui`, `health`, `heart`, `half` |
| `ui_heart_empty` | 16x16 | Empty heart (HP indicator) | `ui`, `health`, `heart`, `empty` |

## 5. Weapons (16x varies)

All weapon sprites are designed for 16x16 character overlay or ground items.

### Swords

| Tile Name | Dimensions | Usage | Tags |
|-----------|-----------|-------|------|
| `weapon_regular_sword` | 10x21 | Standard iron sword | `weapon`, `sword`, `melee`, `common` |
| `weapon_knight_sword` | 10x29 | Knight's longsword | `weapon`, `sword`, `melee`, `uncommon` |
| `weapon_golden_sword` | 10x22 | Golden ceremonial sword | `weapon`, `sword`, `melee`, `rare` |
| `weapon_red_gem_sword` | 10x21 | Ruby-embedded sword | `weapon`, `sword`, `melee`, `rare`, `magic` |
| `weapon_lavish_sword` | 10x30 | Ornate greatsword | `weapon`, `sword`, `melee`, `epic` |
| `weapon_anime_sword` | 12x30 | Anime-style katana | `weapon`, `sword`, `melee`, `exotic` |
| `weapon_katana` | 6x29 | Traditional katana | `weapon`, `sword`, `melee`, `finesse` |
| `weapon_duel_sword` | 9x30 | Rapier/dueling sword | `weapon`, `sword`, `melee`, `finesse` |
| `weapon_rusty_sword` | 10x21 | Rusty old sword | `weapon`, `sword`, `melee`, `damaged` |
| `weapon_saw_sword` | 10x25 | Serrated saw blade | `weapon`, `sword`, `melee`, `exotic` |

### Axes & Hammers

| Tile Name | Dimensions | Usage | Tags |
|-----------|-----------|-------|------|
| `weapon_axe` | 9x21 | Hand axe | `weapon`, `axe`, `melee`, `common` |
| `weapon_double_axe` | 16x24 | Double-bladed battle axe | `weapon`, `axe`, `melee`, `uncommon` |
| `weapon_waraxe` | 12x23 | War axe | `weapon`, `axe`, `melee`, `uncommon` |
| `weapon_throwing_axe` | 10x14 | Throwing axe | `weapon`, `axe`, `thrown`, `common` |
| `weapon_hammer` | 10x24 | War hammer | `weapon`, `hammer`, `melee`, `bludgeoning` |
| `weapon_big_hammer` | 10x37 | Maul/great hammer | `weapon`, `hammer`, `melee`, `heavy`, `bludgeoning` |
| `weapon_mace` | 10x24 | Flanged mace | `weapon`, `mace`, `melee`, `bludgeoning` |

### Polearms & Spears

| Tile Name | Dimensions | Usage | Tags |
|-----------|-----------|-------|------|
| `weapon_spear` | 6x30 | Standard spear | `weapon`, `spear`, `melee`, `reach` |
| `weapon_baton_with_spikes` | 10x22 | Spiked club | `weapon`, `club`, `melee`, `piercing` |

### Blades & Knives

| Tile Name | Dimensions | Usage | Tags |
|-----------|-----------|-------|------|
| `weapon_knife` | 6x13 | Dagger/knife | `weapon`, `dagger`, `melee`, `finesse`, `thrown` |
| `weapon_machete` | 5x22 | Machete | `weapon`, `blade`, `melee`, `slashing` |
| `weapon_cleaver` | 9x19 | Meat cleaver | `weapon`, `blade`, `melee`, `slashing` |

### Ranged Weapons

| Tile Name | Dimensions | Usage | Tags |
|-----------|-----------|-------|------|
| `weapon_bow` | 14x26 | Shortbow | `weapon`, `bow`, `ranged`, `common` |
| `weapon_bow_2` | 14x26 | Longbow | `weapon`, `bow`, `ranged`, `uncommon` |
| `weapon_arrow` | 7x21 | Arrow projectile | `weapon`, `arrow`, `ranged`, `projectile` |

### Magic Staves

| Tile Name | Dimensions | Usage | Tags |
|-----------|-----------|-------|------|
| `weapon_red_magic_staff` | 8x30 | Fire staff | `weapon`, `staff`, `magic`, `fire` |
| `weapon_green_magic_staff` | 8x30 | Nature staff | `weapon`, `staff`, `magic`, `nature` |

## Usage Guidelines

### Grid System
- **Base Grid**: 16x16 pixels per tile
- **Character Height**: 28 pixels (extends above grid)
- **Large Props**: Can span multiple tiles (e.g., crate is 16x24)

### Animation Frame Rates
- **Character Animations**: 8-12 FPS (idle), 12-16 FPS (run)
- **Environmental Animations**: 4-8 FPS (fountains, coins, spikes)
- **Effects**: 12-20 FPS (explosions, magic)

### Autotiling
All floor and wall atlases use **3x3 minimal autotiling**. See [Autotiling Guide](./autotiling.md) for bitmask patterns.

### Depth Layers
For pseudo-3D rendering:
1. Floor layer (base)
2. Floor decorations (cracks, shadows)
3. Character shadows
4. Characters & props (Y-sorted)
5. Wall base (16x16 low walls)
6. Wall tops (16x32 high walls with Y-offset)
7. Overlays (fog, lighting effects)

## Next Steps

- See [Autotiling Guide](./autotiling.md) for tile selection algorithms
- See [Character Sprites](./character-sprites.md) for full sprite dictionary
- See [BSP Room Stamps](./bsp-room-stamps.md) for prefab room templates
