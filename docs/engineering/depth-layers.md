---
tags: [myworld, docs]
---

# Depth Layer Reference

Phaser renders objects with higher depth values on top of lower ones.
All depths used in the game are listed below.

| Depth | Element | Source File | Notes |
|------:|---------|-------------|-------|
| 0 | Tile sprites (floor, walls, etc.) | `src/game.ts` | Default depth (no explicit `setDepth`) |
| 0 | Hit-zone (input area) | `src/game.ts` | Invisible interactive zone covering the map |
| 2 | Enemy sight rings | `src/game.ts` | Circle stroke, normally hidden (alpha 0) |
| 2 | Sight-system debug graphics | `src/systems/sight-system.ts` | Debug overlay for LOS lines |
| 2 | Chest glow | `src/systems/chest-handler.ts` | Subtle highlight around closed chests |
| 3 | Move-range tiles | `src/modes/mode-combat.ts` | Blue overlay during combat movement |
| 3 | Entity interaction markers | `src/systems/entity-system.ts` | Door/chest/interactable tile highlights |
| 5 | Attack-range tiles | `src/modes/mode-combat.ts` | Red overlay + border for melee/ranged targeting |
| 6 | Stage sprites (default) | `src/game.ts` | Decorations: torches, banners, crystals (configurable via YAML `depth`) |
| 7 | Path dots | `src/systems/movement-system.ts` | Breadcrumb trail during pathfinding |
| 8 | Tap indicator | `src/game.ts` | Tile cursor showing where the player tapped |
| 9 | Turn highlight | `src/game.ts` | Highlight ring on the active combatant |
| 9 | Enemy sprites | `src/game.ts` | Character art for enemies |
| 10 | Player sprite | `src/game.ts` | Player character art |
| 11 | Enemy HP bar (background) | `src/game.ts` | Dark bar behind the HP fill |
| 12 | Enemy HP bar (foreground) | `src/game.ts` | Red HP fill + name label |
| 13 | Facing arrow | `src/game.ts` | Triangular arrow showing enemy facing direction |
| 15 | Fog of war | `src/game.ts` | Full-screen graphics layer for fog/vignette |
| 16 | Flee-zone tiles | `src/modes/mode-combat.ts` | Green overlay showing safe flee destinations (above fog) |
| 17 | Sight-flash enemy sprite | `src/systems/sight-system.ts` | Temporarily raised enemy sprite during alert flash |
| 18 | Sight-flash ring | `src/systems/sight-system.ts` | Yellow ring during enemy alert |
| 19 | Sight-flash warning icon | `src/systems/sight-system.ts` | ⚠ text popup during alert |
| 25 | Chest open ring | `src/systems/chest-handler.ts` | Glow effect when opening a chest |
| 26 | Chest loot label | `src/systems/chest-handler.ts` | Text showing loot name |
| 30 | Floating damage text | `src/game.ts` | Damage/heal numbers above characters |
| 30 | Chest item toast | `src/systems/chest-handler.ts` | Large item name popup |
| 50 | Chest banner overlay | `src/systems/chest-handler.ts` | Full-screen loot banner (fixed to camera) |
| 100 | Shadow player (debug) | `src/systems/sight-system.ts` | Debug duplicate of player for sight testing |

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
