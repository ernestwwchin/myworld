---
tags: [gamedev, myworld, design]
created: 2026-04-16
status: active
---

# MyWorld RPG — Gameplay Design

## Core Loop

```
Town (prep) → Portal → Dungeon floors → Extraction/Death → Town (resolve loot) → repeat
```

## Modes

- **Explore mode**: Real-time movement, stealth, NPC interaction, fog of war
- **Combat mode**: Turn-based tactical combat triggered on enemy detection

## Combat (BG3-style)

| Rule | Detail |
|---|---|
| Entry | Enemy spots player OR player manually engages from popup |
| Opener | Player moves to melee range → resolves one attack before combat. Miss = no combat. Hit = combat begins. |
| Initiative | d20 + DEX modifier, highest goes first. Surprised enemies skip first turn. |
| Resources | 1 Action + movement (5 tiles base, +4 with Dash) |
| Actions | Attack, Dash, Flee, spells/abilities (via hotbar) |
| Flee gate | Must be 6+ tiles from nearest enemy AND no enemy line-of-sight |
| Alert | Sight range → group scripting → room-based chain reaction |
| End | All enemies dead (victory) or successful Flee |

## D&D 5e Rules

- Ability scores: STR, DEX, CON, INT, WIS, CHA
- d20 attack rolls vs AC
- Damage dice per weapon
- Skill proficiencies
- Status effects: sleep, poison, hidden
- Starting class: Fighter (others planned: Wizard, Cleric, Ranger)

See [`../ref/5e.md`](../ref/5e.md) for full rules reference.

## Side Quests

- Board in town offers 2–3 contracts per run
- Types: hunt/cull, depth scout, retrieve item
- Accepted quests tracked in run state

## Inventory

- **Carried**: items taken into dungeon for the run
- **Town stash**: persistent storage
- **Extraction banking**: brings loot back. Death applies loss based on difficulty (easy/normal/hard)
