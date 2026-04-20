---
tags: [myworld, play]
---

# Play Guide

How to play MyWorld RPG.

## Goal

Start in the town hub. Pick up quests, descend through dungeon floors, defeat the boss on floor 10, extract back to town. Death loses a portion of carried loot; extraction banks it.

## Controls

> **TODO:** Verify in-game and fill in. Best source is `src/systems/input-system.ts` and `src/modes/`.

| Action | Input |
|---|---|
| Move | _TBD_ |
| Interact / open / loot | _TBD_ |
| Open inventory | _TBD_ |
| Hotbar slots | _TBD_ |
| End turn (combat) | _TBD_ |
| Flee (combat) | _TBD_ |
| Toggle stealth | _TBD_ |

## Modes

The game has two modes:
- **Explore** — real-time movement around the map
- **Combat** — turn-based with initiative; entered when an enemy detects you and engages

See [combat.md](combat.md) for full combat rules (engage flow, opener attacks, alerting, flee zones, conditions).

## UI overview

> **TODO:** Annotate screenshot and describe each panel.

- HUD (top): floor, HP, mode badge
- Hotbar (bottom): equipped abilities/items
- Side panel (right): inventory, character, party, combat log
- Initiative bar (right edge during combat)

## Town hub

Returning to town:
- **Stash** — deposit/withdraw items between runs
- **Merchant** — buy/sell (stub: "Coming soon")
- **Quest board** — accept side quests (stub: "Coming soon")
- **Portal** — enter a dungeon world
