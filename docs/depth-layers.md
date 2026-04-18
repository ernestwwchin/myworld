---
tags: [myworld, docs]
---

# Depth Layer Reference

Phaser renders objects with higher depth values on top of lower ones.
All depths used in the game are listed below.

| Depth | Element | Source File | Notes |
|------:|---------|-------------|-------|
| 0 | Tile sprites (floor, walls, etc.) | `js/game.js` | Default depth (no explicit `setDepth`) |
| 0 | Hit-zone (input area) | `js/game.js` | Invisible interactive zone covering the map |
| 2 | Enemy sight rings | `js/game.js` | Circle stroke, normally hidden (alpha 0) |
| 2 | Sight-system debug graphics | `js/systems/sight-system.js` | Debug overlay for LOS lines |
| 2 | Chest glow | `js/systems/chest-handler.js` | Subtle highlight around closed chests |
| 3 | Move-range tiles | `js/modes/mode-combat.js` | Blue overlay during combat movement |
| 3 | Entity interaction markers | `js/systems/entity-system.js` | Door/chest/interactable tile highlights |
| 5 | Attack-range tiles | `js/modes/mode-combat.js` | Red overlay + border for melee/ranged targeting |
| 6 | Stage sprites (default) | `js/game.js` | Decorations: torches, banners, crystals (configurable via YAML `depth`) |
| 7 | Path dots | `js/systems/movement-system.js` | Breadcrumb trail during pathfinding |
| 8 | Tap indicator | `js/game.js` | Tile cursor showing where the player tapped |
| 9 | Turn highlight | `js/game.js` | Highlight ring on the active combatant |
| 9 | Enemy sprites | `js/game.js` | Character art for enemies |
| 10 | Player sprite | `js/game.js` | Player character art |
| 11 | Enemy HP bar (background) | `js/game.js` | Dark bar behind the HP fill |
| 12 | Enemy HP bar (foreground) | `js/game.js` | Red HP fill + name label |
| 13 | Facing arrow | `js/game.js` | Triangular arrow showing enemy facing direction |
| 15 | Fog of war | `js/game.js` | Full-screen graphics layer for fog/vignette |
| 16 | Flee-zone tiles | `js/modes/mode-combat.js` | Green overlay showing safe flee destinations (above fog) |
| 17 | Sight-flash enemy sprite | `js/systems/sight-system.js` | Temporarily raised enemy sprite during alert flash |
| 18 | Sight-flash ring | `js/systems/sight-system.js` | Yellow ring during enemy alert |
| 19 | Sight-flash warning icon | `js/systems/sight-system.js` | ⚠ text popup during alert |
| 25 | Chest open ring | `js/systems/chest-handler.js` | Glow effect when opening a chest |
| 26 | Chest loot label | `js/systems/chest-handler.js` | Text showing loot name |
| 30 | Floating damage text | `js/game.js` | Damage/heal numbers above characters |
| 30 | Chest item toast | `js/systems/chest-handler.js` | Large item name popup |
| 50 | Chest banner overlay | `js/systems/chest-handler.js` | Full-screen loot banner (fixed to camera) |
| 100 | Shadow player (debug) | `js/systems/sight-system.js` | Debug duplicate of player for sight testing |

## Layer Groups

```
 100  ┄ Debug overlays
  50  ┄ Full-screen popups (chest banner)
  30  ┄ Floating text (damage numbers, toasts)
  25  ┄ VFX rings (chest open)
─────── Above fog ───────
16-19  ┄ Flee zone, sight-flash effects
  15  ┄ Fog of war
─────── Below fog ───────
11-13  ┄ HP bars, labels, facing arrows
  10  ┄ Player sprite
   9  ┄ Enemy sprites, turn highlight
   8  ┄ Tap indicator
   7  ┄ Path dots
   6  ┄ Stage decorations
   5  ┄ Attack range overlay
   3  ┄ Move range / entity markers
   2  ┄ Sight rings, chest glow
   0  ┄ Tile map, hit zone
```

## Guidelines

- **Fog boundary is depth 15.** Anything that must remain visible during fog should be ≥ 16.
- Enemy sprites (9) and player (10) are intentionally **below fog** — the fog system controls their visibility via alpha, not depth.
- Stage sprite depth is configurable in YAML (`depth` field, default 6).
- Floating text and chest banners use 30+ to guarantee they appear above everything during gameplay.
