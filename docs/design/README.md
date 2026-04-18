---
tags: [gamedev, myworld, design]
---

# Design

Curated design intent for MyWorld RPG. Everything here is something we plan to build, are building, or have built. For raw brainstorms, see [`../ideas/`](../ideas/README.md).

## Index

| Document | Contents |
|---|---|
| [concept.md](concept.md) | Elevator pitch and core vision |
| [story-setting.md](story-setting.md) | World structure, tone, dungeon floors, town hub |
| [gameplay.md](gameplay.md) | Core loop, modes, combat rules, inventory, side quests |
| [world-generation.md](world-generation.md) | Map generation, stage descriptor system, run state |
| [tech-stack.md](tech-stack.md) | Technology choices, architecture, file structure |
| [ui-design.md](ui-design.md) | Panel layout, HUD, popups, dice overlay, fog of war |
| [roadmap.md](roadmap.md) | Phase 2–4 planned features (narrative form) |
| [modding-overview.md](modding-overview.md) | Mod tiers — data, tuning, hooks, scripts |
| [decisions/](decisions/decisions.md) | Architecture decisions — what, why, trade-offs |

## Planned deep-dives

These are areas the project will go deep on later. Files arrive when there's real content; for now the homes are reserved:

| Topic | Lands in |
|---|---|
| Sprite / sound / music sourcing (buy vs craft, criteria) | `design/assets.md` (intent) + [`../engineering/sprites.md`](../engineering/sprites.md), [`../engineering/tileset-sourcing.md`](../engineering/tileset-sourcing.md) (technical/legal); future `engineering/audio.md` |
| Multiple map generator algorithms + map events / interactives | [world-generation.md](world-generation.md) (algorithm intent); [`../modding/README.md`](../modding/README.md) (event authoring) |
| Art direction (maps, characters) | `design/art-direction.md` |
| Backstory, main story, side quests, scripts | [story-setting.md](story-setting.md), then promoted into a `design/story/` folder when files multiply |
| Framework re-evaluation (Phaser → alternatives, 2.5D/3D, UI overhaul) | New ADR in [decisions/](decisions/decisions.md) + updates to [tech-stack.md](tech-stack.md) |

## Cross-links

| If you want… | Go to |
|---|---|
| Player rules and controls | [`../play/`](../play/README.md) |
| Modder reference (full schema/hooks) | [`../modding/`](../modding/README.md) |
| D&D 5e rules lookup | [`../ref/5e/`](../ref/5e/README.md) |
| Code-level subsystem reference | [`../engineering/`](../engineering/README.md) |
| Free-form idea capture | [`../ideas/`](../ideas/README.md) |
