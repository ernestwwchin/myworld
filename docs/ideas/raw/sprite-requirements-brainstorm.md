# Sprite & Asset Requirements

Status: raw
Date: 2026-04-23
Source: design discussion

---

## Art Direction

- **Style:** 16×16 pixel art, scaled 2× or 3× to display (current: 0x72 DungeonTileset II)
- **Palette:** Consistent with 0x72 atlas (~32 color dungeon palette)
- **Format:** Individual PNGs → packed into atlas (PNG + JSON) via texture packer
- **Animation:** 4-frame idle, 4-frame walk/run, 1-2 frame hit, 4-frame attack
- **Approach:** Emoji MVP first → PixelLab AI generation later → manual cleanup

## Generation Pipeline (Future)

```
  SPRITE PIPELINE
  │
  ├── Phase 1: Emoji MVP (W1)
  │   └── All items, NPCs, UI use emoji/Unicode in HTML
  │       Characters and terrain use existing 0x72 atlas
  │
  ├── Phase 2: PixelLab Generation (post-W1)
  │   ├── MCP integration: claude mcp add pixellab ...
  │   ├── create_character() → 4-dir idle + walk + attack
  │   ├── create_topdown_tileset() → Wang tiles for terrain
  │   ├── create_map_object() → furniture, deco, props
  │   ├── Style reference: feed existing 0x72 frames for consistency
  │   └── Cost: ~$0.007/sprite at 32×32 ($0.01 at 64×64)
  │
  ├── Phase 3: Texture Packing
  │   ├── Tool: free-tex-packer / ShoeBox / texturepacker-cli
  │   ├── Input: individual PNGs from PixelLab
  │   ├── Output: atlas.png + atlas.json (Phaser format)
  │   └── Register in sprites.yaml (same as current system)
  │
  └── Phase 4: Manual Cleanup (as needed)
      ├── Aseprite for frame-by-frame tweaks
      ├── Pixel-Perfect-Aligner (GIMP plugin) for grid snapping
      └── Consistency pass: match palette, fix outlines
```

---

## Current Assets (0x72 Atlas)

What we already have from `0x72_DungeonTilesetII_v1.7`:

### Terrain Tiles (✅ Have)
| Sprite Key | Frame | Notes |
|---|---|---|
| `t_floor` | floor_1, floor_2, floor_3, floor_4 | 4 variants |
| `t_wall` | wall_mid, wall_left, wall_right | 3 variants |
| `t_door` | doors_leaf_closed | Closed state |
| `t_door_open` | doors_leaf_open | Open state |
| `t_chest` | chest_full_open_anim_f0 | Closed state |
| `t_chest_open` | chest_empty_open_anim_f2 | Open state |
| `t_stairs` | floor_stairs | Down stairs |
| `t_water` | floor_1 (tinted) | Animated 2-frame |
| `t_grass` | floor_4 (tinted) | Animated 2-frame |

### Characters (✅ Have)
| Type | Idle | Walk/Run | Hit | Notes |
|---|---|---|---|---|
| `player` | elf_m_idle ×4 | elf_m_run ×4 | elf_m_hit ×1 | Male elf |
| `goblin` | goblin_idle ×4 | goblin_run ×4 | — | Basic enemy |
| `skeleton` | skelet_idle ×4 | skelet_run ×4 | — | Undead enemy |
| `orc` | orc_idle ×4 | orc_run ×4 | — | Heavy enemy |
| `orc_shaman` | orc_shaman_idle ×4 | orc_shaman_run ×4 | — | Caster enemy |
| `big_demon` | big_demon_idle ×4 | big_demon_run ×4 | — | Boss-sized |
| `ogre` | ogre_idle ×4 | ogre_run ×4 | — | Heavy enemy |

### Decorations (✅ Have)
| Key | Frame | Notes |
|---|---|---|
| `deco_torch` | wall_torch | Wall-mounted |
| `deco_column` | column_mid | Pillar |
| `deco_crate` | crate | Wooden crate |
| `deco_skull` | skull | Floor decoration |
| `deco_banner` | wall_banner | Wall hanging |
| `deco_crystal` | — | Procedural/placeholder |

### Overlays (✅ Have — Procedural)
| Key | Purpose |
|---|---|
| `t_flee` | Green zone (flee-safe tiles) |
| `t_move` | Blue zone (movement range) |
| `t_atk` | Red zone (attack range) |
| `t_tap` | Gold circle (tap indicator) |
| `t_turn` | Gold rect (turn indicator) |
| `t_loot_bag` | Loot drop marker |
| `_fog_rt` | Fog of war canvas |

---

## Needed Assets — Full Inventory

### 1. Player Characters

Need different sprites per class. Currently all use `elf_m`.

| ID | Description | Frames Needed | Priority |
|---|---|---|---|
| `player_fighter` | Human/dwarf fighter, heavy armor | idle×4, walk×4, attack×4, hit×1 | P0 (W1) |
| `player_rogue` | Hooded rogue, light armor, daggers | idle×4, walk×4, attack×4, hit×1 | P0 (W1) |
| `player_wizard` | Robed wizard, staff | idle×4, walk×4, cast×4, hit×1 | P1 |
| `player_cleric` | Armored cleric, mace + shield | idle×4, walk×4, attack×4, hit×1 | P1 |
| `player_ranger` | Cloaked ranger, bow | idle×4, walk×4, shoot×4, hit×1 | P2 |

**W1 MVP:** Can reuse `elf_m` for all classes. Class distinction via UI only.

### 2. Enemy Characters — W1 Goblin Warren

| ID | Description | Frames Needed | Priority |
|---|---|---|---|
| `goblin` | Basic goblin (✅ have) | idle×4, walk×4 | ✅ Done |
| `goblin_archer` | Goblin with shortbow | idle×4, walk×4 | P0 |
| `goblin_shaman` | Robed goblin, glowing staff | idle×4, walk×4, cast×4 | P0 |
| `goblin_warrior` | Armored goblin, sword+shield | idle×4, walk×4 | P0 |
| `goblin_warlord` | Boss — large goblin, greataxe, crown | idle×4, walk×4, attack×4 | P0 |
| `dire_rat` | Giant rat | idle×4, walk×4 | P1 |
| `cave_spider` | Spider enemy | idle×4, walk×4 | P1 |

**W1 MVP:** All goblin variants can use base `goblin` sprite. Boss can use `orc` or `big_demon`.

### 3. Enemy Characters — Future Worlds

| ID | Description | World | Priority |
|---|---|---|---|
| `skeleton_warrior` | Armored skeleton | W2 Undead | P2 |
| `skeleton_archer` | Skeleton with bow | W2 | P2 |
| `skeleton_mage` | Robed skeleton, magic | W2 | P2 |
| `zombie` | Shambling undead | W2 | P2 |
| `ghost` | Semi-transparent spirit | W2 | P2 |
| `necromancer` | Boss — robed dark caster | W2 | P2 |
| `bandit` | Human enemy | W3 | P3 |
| `wolf` | Animal enemy | W3 | P3 |
| `dragon_wyrmling` | Small dragon | W4+ | P3 |

### 4. NPC Characters — Town

| ID | Description | Frames Needed | Priority |
|---|---|---|---|
| `npc_blacksmith` | Muscular, apron, hammer | idle×4 | P1 |
| `npc_merchant` | Robed trader, bag | idle×4 | P1 |
| `npc_quest_giver` | Notice board / hooded figure | idle×4 | P1 |
| `npc_healer` | White robe, glowing hands | idle×4 | P2 |
| `npc_guard` | Town guard, spear | idle×4 | P2 |

**W1 MVP:** Town NPCs are interactable entities with emoji icons. No sprite needed.

### 5. Companion Characters

| ID | Description | Frames Needed | Priority |
|---|---|---|---|
| `companion_kira` | Young woman, dagger, leather armor | idle×4, walk×4, attack×4, hit×1 | P0 (W1) |

**W1 MVP:** Kira can use existing `elf_m` recolored, or a female elf frame if available in 0x72.

### 6. Terrain Tiles — Dungeon

| ID | Description | Variants | Priority |
|---|---|---|---|
| `t_floor` | Stone floor (✅ have) | 4 | ✅ Done |
| `t_wall` | Stone wall (✅ have) | 3 | ✅ Done |
| `t_door` / `t_door_open` | Wooden door (✅ have) | 2 | ✅ Done |
| `t_stairs_up` | Stairs going up | 1 | P1 |
| `t_stairs_down` | Stairs going down (✅ have as `t_stairs`) | 1 | ✅ Done |
| `t_pit` | Dark pit / hole | 1 | P2 |
| `t_lava` | Lava tile (animated) | 2 | P2 |
| `t_ice` | Frozen floor (slippery) | 1 | P2 |
| `t_bridge` | Wooden bridge over pit/water | 1 | P2 |
| `t_rubble` | Collapsed wall / debris | 2 | P2 |
| `t_moss_floor` | Overgrown stone floor | 2 | P1 |
| `t_cave_wall` | Natural cave wall (vs. brick) | 3 | P1 |
| `t_cave_floor` | Natural cave floor | 2 | P1 |

**W1 MVP:** Existing tiles are sufficient. Cave variants nice-to-have.

### 7. Terrain Tiles — Town / Overworld

| ID | Description | Variants | Priority |
|---|---|---|---|
| `t_town_floor` | Cobblestone / paved road | 2 | P1 |
| `t_town_wall` | Building wall / facade | 3 | P1 |
| `t_town_roof` | Rooftop tile | 1 | P2 |
| `t_dirt_path` | Dirt road | 2 | P2 |
| `t_grass_floor` | Green grass | 2 | P1 |
| `t_flower` | Grass with flowers | 1 | P2 |
| `t_fence` | Wooden fence | 2 | P2 |

**W1 MVP:** Town uses same dungeon floor tiles. Works fine for "Portal Square" aesthetic.

### 8. Furniture & Decorations — Dungeon

| ID | Description | States | Priority |
|---|---|---|---|
| `deco_torch` | Wall torch (✅ have) | 1 (can animate glow) | ✅ Done |
| `deco_column` | Stone pillar (✅ have) | 1 | ✅ Done |
| `deco_crate` | Wooden crate (✅ have) | 1 | ✅ Done |
| `deco_skull` | Skull on floor (✅ have) | 1 | ✅ Done |
| `deco_banner` | Wall banner (✅ have) | 1 | ✅ Done |
| `deco_barrel` | Barrel | 1 | P1 |
| `deco_bookshelf` | Bookshelf against wall | 1 | P1 |
| `deco_table` | Wooden table | 1 | P1 |
| `deco_chair` | Wooden chair | 1 | P2 |
| `deco_bed` | Bed / cot | 1 | P2 |
| `deco_cauldron` | Brewing cauldron (goblin camp) | 1 | P1 |
| `deco_campfire` | Small campfire (animated) | 2 frames | P0 |
| `deco_bones` | Pile of bones | 1 | P1 |
| `deco_chains` | Wall chains / shackles | 1 | P2 |
| `deco_web` | Spider web (corner/full) | 2 | P1 |
| `deco_mushroom` | Glowing cave mushroom | 2 (glow/dim) | P1 |
| `deco_statue` | Stone statue (gargoyle/knight) | 1 | P2 |
| `deco_fountain` | Water fountain (animated) | 2 frames | P2 |
| `deco_anvil` | Blacksmith anvil (town) | 1 | P1 |
| `deco_sign` | Wooden sign post | 1 | P1 |
| `deco_cart` | Market cart (town) | 1 | P2 |
| `deco_well` | Stone well | 1 | P2 |
| `deco_cage` | Prison cage | open/closed | P2 |
| `deco_altar` | Ritual altar | 1 | P2 |
| `deco_coffin` | Coffin (closed/open) | 2 | P2 (W2) |
| `deco_grave` | Gravestone | 1 | P2 (W2) |

**W1 MVP:** Campfire is P0 for rest mechanic. Others are atmosphere — can skip.

### 9. Furniture & Decorations — Town

| ID | Description | Priority |
|---|---|---|
| `deco_shop_counter` | Merchant counter | P1 |
| `deco_weapon_rack` | Display weapons | P1 |
| `deco_armor_stand` | Display armor | P2 |
| `deco_notice_board` | Quest board (wooden) | P1 |
| `deco_stash_chest` | Town stash (larger chest) | P1 |
| `deco_portal` | Dungeon entry portal (glowing) | P0 |
| `deco_lamp_post` | Town street lamp | P2 |
| `deco_flower_pot` | Decorative pot | P2 |

**W1 MVP:** Portal exists as `deco_crystal`. Others are nice-to-have.

### 10. Interactive Objects

| ID | Description | States | Priority |
|---|---|---|---|
| `obj_chest` | Loot chest (✅ have) | closed/open | ✅ Done |
| `obj_door` | Door (✅ have) | closed/open | ✅ Done |
| `obj_lever` | Wall lever | up/down | P1 |
| `obj_pressure_plate` | Floor pressure plate | inactive/active | P1 |
| `obj_trap_spike` | Spike trap | hidden/revealed/triggered | P1 |
| `obj_trap_fire` | Fire trap | hidden/revealed/triggered | P2 |
| `obj_trap_poison` | Poison gas vent | hidden/revealed/triggered | P2 |
| `obj_barrel_explosive` | Red barrel (explodes) | normal/exploding | P2 |
| `obj_crystal_save` | Save/checkpoint crystal | dim/bright | P2 |
| `obj_portal` | Teleport portal (animated) | 2-4 frames | P1 |
| `obj_extraction_sigil` | Return-to-town sigil | 2 frames (pulse) | P0 |

**W1 MVP:** Extraction sigil is P0 (currently uses `deco_crystal`).

### 11. Item Icons

Currently all emoji. Need proper pixel art icons for inventory/shop/loot UI.

| Category | Items | Priority |
|---|---|---|
| **Potions** | heal (red), mana (blue), poison cure (green), strength (orange) | P1 |
| **Scrolls** | fire, ice, lightning, heal, generic | P2 |
| **Weapons** | shortsword, longsword, dagger, mace, staff, shortbow, longbow | P1 |
| **Armor** | leather, chain, plate, robe, shield | P1 |
| **Gems** | ruby, sapphire, emerald, diamond, generic | P2 |
| **Keys** | iron key, gold key, boss key | P1 |
| **Tools** | thieves_tools, torch, rope, lockpick | P1 |
| **Materials** | goblin ear, spider silk, bone fragment | P2 |
| **Food** | field ration, bread, meat, mushroom | P2 |
| **Quest items** | warlord's crown, warren map, sealed letter | P1 (per quest) |
| **Gold** | coin, coin pile, gold bag | P1 |

**W1 MVP:** Emoji is fine. Pixel icons are a polish pass.

### 12. Skill / Ability Effects

Visual effects shown during combat.

| ID | Description | Frames | Priority |
|---|---|---|---|
| `fx_slash` | Melee hit slash (white arc) | 3 | P0 |
| `fx_stab` | Dagger thrust | 2 | P1 |
| `fx_arrow` | Arrow projectile | 1 (+ trail) | P1 |
| `fx_fire_bolt` | Fire projectile | 2 (+ trail) | P1 |
| `fx_ice_shard` | Ice projectile | 2 (+ trail) | P2 |
| `fx_lightning` | Lightning bolt | 3 | P2 |
| `fx_heal` | Green/white sparkle (heal) | 3 | P1 |
| `fx_shield` | Blue flash (block/shield) | 2 | P2 |
| `fx_poison_cloud` | Green gas puff | 3 | P1 |
| `fx_explosion` | Fire explosion (AoE) | 4 | P2 |
| `fx_blood` | Hit blood splatter | 2 | P1 |
| `fx_miss` | Whoosh / dodge trail | 2 | P2 |
| `fx_crit` | Big impact flash | 3 | P1 |
| `fx_levelup` | Level up sparkle | 4 | P1 |
| `fx_death` | Enemy death poof/fade | 3 | P1 |
| `fx_stealth` | Shadow/fade effect | 2 | P2 |
| `fx_buff` | Upward sparkle (status apply) | 3 | P2 |
| `fx_debuff` | Downward drip (status apply) | 3 | P2 |

**W1 MVP:** Currently uses tween effects (alpha flash, shake, float text). No sprite FX needed yet.

### 13. Status Effect Icons

Small icons shown on actor portraits / status bar.

| ID | Description | Priority |
|---|---|---|
| `status_poisoned` | Green skull / droplet | P1 |
| `status_burning` | Flame | P1 |
| `status_frozen` | Snowflake / ice | P2 |
| `status_stunned` | Stars / spiral | P1 |
| `status_hidden` | Eye with slash | P1 |
| `status_bleeding` | Red droplets | P2 |
| `status_haste` | Lightning bolt | P2 |
| `status_shield` | Blue shield glow | P2 |
| `status_enraged` | Red fist / angry face | P1 |
| `status_blessed` | Golden halo | P2 |

**W1 MVP:** Emoji icons in HTML. Current system uses `icon: "🤢"` etc.

### 14. UI Elements

| ID | Description | Priority |
|---|---|---|
| `ui_hp_bar_bg` | Health bar background | P2 |
| `ui_hp_bar_fill` | Health bar fill (red) | P2 |
| `ui_hp_bar_damage` | Damage flash overlay | P2 |
| `ui_xp_bar` | XP bar | P2 |
| `ui_portrait_frame` | Character portrait border | P2 |
| `ui_hotbar_slot` | Hotbar slot background | P2 |
| `ui_hotbar_highlight` | Selected slot glow | P2 |
| `ui_inventory_slot` | Inventory grid slot | P2 |
| `ui_button_base` | Generic button 9-slice | P2 |
| `ui_tooltip_bg` | Tooltip background 9-slice | P2 |
| `ui_dialog_frame` | Dialog box frame | P2 |
| `ui_minimap_frame` | Minimap border | P3 |

**W1 MVP:** All UI is HTML/CSS. Pixel UI is pure polish.

---

## Priority Summary

### P0 — Must Have for W1 Playable (emoji OK)

| Category | Count | Notes |
|---|---|---|
| Player class sprites | 0 (reuse elf_m) | Emoji differentiates class |
| Goblin variants | 0 (reuse goblin) | All goblins look same, OK for MVP |
| Kira companion | 0 (reuse elf_m or skip) | Can introduce as dialog-only |
| Boss (warlord) | 0 (use big_demon or orc) | Re-skin via name/stats |
| Extraction sigil | 0 (use deco_crystal) | Already working |
| Campfire (rest) | 0 (use deco_torch or skip) | Rest can be menu-only |
| **Total new sprites needed:** | **0** | **Emoji MVP needs zero new art** |

### P1 — Nice-to-Have for W1 Polish

| Category | Items | Est. Sprites |
|---|---|---|
| Goblin variants (archer, shaman, warrior, warlord) | 4 characters × 8 frames | 32 |
| Kira companion | 1 character × 13 frames | 13 |
| Dungeon furniture (barrel, bookshelf, web, bones, cauldron) | 8 items | 8 |
| Town deco (shop counter, notice board, portal) | 4 items | 4 |
| Item icons (weapons, potions, keys) | ~20 items | 20 |
| Ability FX (slash, heal, crit, death) | 5 effects × 3 frames | 15 |
| **Total:** | | **~92 sprites** |

**PixelLab cost estimate:** 92 × $0.007 = **~$0.65**

### P2 — Post-W1

| Category | Est. Sprites |
|---|---|
| Player class variants (5 classes × 13 frames) | 65 |
| W2 enemies (skeleton variants, zombie, ghost, necromancer) | 56 |
| Advanced terrain (lava, ice, pit, bridge) | 10 |
| Advanced furniture (statue, fountain, altar, coffin) | 12 |
| All item icons (gems, scrolls, materials, food) | 30 |
| All ability FX | 30 |
| Status effect icons | 10 |
| Trap objects | 8 |
| UI pixel art | 12 |
| **Total:** | **~233 sprites** |

---

## Sprite Generation Workflow (PixelLab)

### Setup

```bash
# Add PixelLab MCP to Claude Code
claude mcp add pixellab https://api.pixellab.ai/mcp -t http -H "Authorization: Bearer YOUR_TOKEN"

# Or use API directly
curl -X POST https://api.pixellab.ai/v2/generate-image-bitforge \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "description": "16x16 pixel art goblin archer, top-down RPG style",
    "width": 32, "height": 32,
    "transparent_background": true,
    "style_image": "base64_of_existing_0x72_goblin_frame"
  }'
```

### Character Pipeline

```
  1. Generate reference frame (idle_f0) with style ref from 0x72
  2. create_character(description, n_directions=4) → 4-dir idle sheet
  3. animate_character(char_id, "walk") → 4-frame walk
  4. animate_character(char_id, "attack") → 4-frame attack
  5. Manual cleanup in Aseprite if needed
  6. Pack all frames → character_{type}.png
  7. Add to sprites.yaml:
     characters:
       goblin_archer:
         atlas: custom_characters
         idle: [goblin_archer_idle_f0, ..._f3]
         run: [goblin_archer_run_f0, ..._f3]
```

### Tileset Pipeline

```
  1. create_topdown_tileset(
       lower="stone floor",
       upper="cave wall",
       style_ref=existing_0x72_frame
     ) → Wang tileset
  2. Split into individual tiles
  3. Name: t_cave_wall_NE, t_cave_wall_NW, etc.
  4. Pack into atlas
  5. Register autotile rules in sprites.yaml
```

### Item Icon Pipeline

```
  1. generate-image-bitforge(
       description="16x16 pixel art healing potion, red liquid in glass bottle",
       width=16, height=16,
       transparent_background=true,
       style_ref=existing_0x72_item
     )
  2. Batch generate all item icons (script loop)
  3. Pack into items_atlas.png
  4. Reference from items.yaml: icon: items_atlas:potion_heal
```

### Alternative: Free Atlas Sources

| Source | URL | License | Quality |
|---|---|---|---|
| 0x72 DungeonTileset II (current) | itch.io/0x72 | CC0 | Great |
| 0x72 v2 (check for updates) | itch.io/0x72 | CC0 | Great |
| Kenney 1-Bit Pack | kenney.nl | CC0 | Good (different style) |
| Ninja Adventure | pixel-boy.itch.io | CC0 | Great (different style) |
| Dungeon Crawl Stone Soup tiles | github.com/crawl | CC0 | Classic |
| LPC (Liberated Pixel Cup) | opengameart.org | CC-BY-SA/GPL | Huge variety |

**Recommendation:** Stick with 0x72 family for consistency. Check if v2 has the goblin variants and furniture we need before generating custom sprites.
