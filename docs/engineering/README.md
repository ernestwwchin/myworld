---
tags: [myworld, engineering]
---

# Engineering Reference

For AI tools and developers working on the codebase. The Claude-loaded entry point is [`/CLAUDE.md`](../../CLAUDE.md) at the repo root — start there for the high-level map. This folder holds focused subsystem references.

## Conventions and patterns

- [conventions.md](conventions.md) — naming, globals, code style rules
- [architecture.md](architecture.md) — module extraction, system integration, event patterns
- [testing.md](testing.md) — contracts/unit-pure/unit-sandbox/e2e test layers and patterns

## Subsystems

- [ai-behavior.md](ai-behavior.md) — enemy state machines, alerting, room propagation
- [fog-of-war.md](fog-of-war.md) — fog renderer, LOS visibility, smooth boundaries
- [depth-layers.md](depth-layers.md) — Phaser render-depth assignments
- [debug-bridge.md](debug-bridge.md) — remote debug interface (SSE + curl)

## Assets

- [**🎨 Tile System**](../tile-system.md) — **Complete tile reference (catalog, autotiling, sprites, stamps)**
  - [Tile Catalog](./tile-catalog.md) — 400+ tiles with usage tags
  - [Autotiling Guide](./autotiling.md) — 3x3 minimal bitmask system
  - [Character Sprites](./character-sprites.md) — All animations and monsters
  - [BSP Room Stamps](./bsp-room-stamps.md) — Prefab room templates
- [sprites.md](sprites.md) — sprite atlas, Phaser integration, display sizing
- [tileset-sourcing.md](tileset-sourcing.md) — tileset selection, licensing, asset shortlist
- [ui-design-bg3.md](ui-design-bg3.md) — BG3-inspired UI patterns at code level

## Where this differs from other docs

| If you want to know… | Read |
|---|---|
| How a system works in code | here (`engineering/`) |
| Why the system exists / its design intent | [`design/`](../design/README.md) |
| How to author content for the system | [`modding/`](../modding/README.md) |
| What the player sees | [`play/`](../play/README.md) |
