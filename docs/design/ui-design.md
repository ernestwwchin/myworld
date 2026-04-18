---
tags: [gamedev, myworld, design]
created: 2026-04-16
status: active
---

# MyWorld RPG — UI Design Reference

BG3-inspired layout.

## Panels

- **Side panel** (280px): Tabbed — Character, Inventory, Abilities, Journal. Collapsible.
- **Bottom panel** (240px): Hotbar (3×10 grid) + Action Center + Command Strip + Combat Log

## HUD Overlay

HP bar, floor indicator, position, light level, mode badge, initiative bar

## Popups

- Enemy stat card
- Attack prediction (hit %, damage range)
- Hotbar tooltip

## Special Effects

- **Dice overlay**: Animated 3D CSS dice roll on attacks
- **Fog of war**: Hybrid smooth renderer
  - Unvisited = black
  - Explored = dim overlay
  - Visible = clear
