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

## Factions & AI Alignments

To support dynamic scenarios (like the Black Market or Rescue quests), entities belong to specific alignments that dictate their behavior:

- **Hostile (Enemies)**: The standard dungeon monster. If they have line-of-sight to the player, they immediately turn red and engage in combat. (e.g., Goblins, Skeletons, Bosses).
- **Neutral (NPCs / Wildlife)**: They will not attack the player and usually wander aimlessly or stand at their posts. However, if the player attacks them or commits a crime (like stealing from the Black Market), they will immediately switch to Hostile.
- **Friendly (Allies)**: They will never attack the player. If combat breaks out near them, they might either flee to safety or actively help the player attack Hostile targets. (e.g., Town Merchants, Rescued Escort targets).

## D&D 5e Rules

- Ability scores: STR, DEX, CON, INT, WIS, CHA
- d20 attack rolls vs AC
- Damage dice per weapon
- Skill proficiencies
- Status effects: sleep, poison, hidden
- Starting class: Fighter (others planned: Wizard, Cleric, Ranger)

## Universal Race & Class System

To create deep, tactical variety, **entities (both Hostile and Friendly) are built using the exact same framework as the Player.** 

Instead of fighting a generic "Bandit" with arbitrary stats, you might encounter a **"Tiefling Rogue"** or an **"Orc Barbarian"**.
- **Races**: Determine base ability score modifiers, movement speed, and innate traits (e.g., Elves having Darkvision or resistance to sleep).
- **Classes**: Dictate the entity's action economy, spell slots, and available abilities. A Level 3 Hostile Wizard has access to the exact same spell list and resource constraints as a Level 3 Player Wizard.

This system ensures that:
1. Combat remains perfectly balanced and predictable according to 5e rules.
2. The map generator can spawn diverse, thematic encounter groups (e.g., an "Orc Warband" containing 3 Fighters, 1 Cleric, and 1 Ranger).
3. Rescued NPCs can immediately join your party or help in combat using fully functional, standardized kits.

See [`../ref/5e/`](../ref/5e/README.md) for full rules reference.

## Side Quests

- Board in town offers 2–3 contracts per run
- Types: hunt/cull, depth scout, retrieve item
- Accepted quests tracked in run state

## Inventory

- **Carried**: items taken into dungeon for the run
- **Town stash**: persistent storage
- **Extraction banking**: brings loot back. Death applies loss based on difficulty (easy/normal/hard)
