---
tags: [myworld, ideas, world, content, ui]
created: 2026-04-20
status: open
decision: "World lore, map quest scenarios, rest points, and UI for new systems?"
---

# Open Decision: World, Content & UI

> **Key question:** What is the world's backstory, what quest scenarios should dungeons contain, and how does the UI surface new power systems?

## Context

**Current confirmed design:**
- [story-setting.md](../design/story-setting.md): Dark fantasy, town → dungeon → town, 10 floors, Goblin Invasion theme
- [gameplay.md](../design/gameplay.md): BG3-style combat, faction system (Hostile/Neutral/Friendly), side quests from board
- Town interactables: stash, shop (stub), quest board (stub)
- Built entity types: chest, door, floor-item, interactable

This doc has **three separable topics:**
1. **World lore** — backstory, setting, zone structure (independent)
2. **Quest scenarios** — generator blueprints for themed floors (independent, but each has technical prerequisites)
3. **UI for soul cores** — only relevant if [power-system.md](power-system.md) Model 1 is chosen

---

## Part 1: World Lore (independent)

### The Ancient Temple
A structure so old no one knows its origin. Its one function: **it summons characters from other worlds**. There is no way back.

The summoned survivors — humans, elves, dwarves — built the Town Hub over generations. **The player is the most recently summoned character.**

> **⚠ Conflict:** The confirmed `story-setting.md` defines a dark fantasy tone but doesn't mention interdimensional summoning. This lore would need to either **replace** the existing setting or be reconciled with it.

### Player Motivation
- **Why am I here?** The Temple brought you.
- **Why can't I go home?** The Temple only works one direction.
- **Why is everyone tough?** Everyone is a descendant of, or a direct summoned survivor.
- **What's the goal?** Push back monsters, reclaim land, discover why the Temple summons people.

### Act 1: The Frontier (World Map)

> **⚠ Note:** This zone structure assumes the macro-floor model from [run-and-pacing.md](run-and-pacing.md). Under the current 10 micro-floor structure, these would be individual stages in a depth band instead.

**Fixed Zones** (always present):

| Zone | Description | Biome |
|---|---|---|
| Ancient Temple | Spawn point. Rest point + stash box. | Temple |
| Goblin Cave | Primary threat, contains Act 1 boss (Goblin Warlord). | Cave |
| Attacked Village | Overrun settlement, captive villagers (Prison Rescue). | Ruins |

**Randomized Zones** (seed picks 2–3 per run):

| Zone | Description | Biome |
|---|---|---|
| Abandoned Village | Ghost town, traps, lost loot, Cursed Shrine events. | Ruins |
| Abandoned Mine | Collapsed mine, orcs/spiders, locked vault. | Mines |
| Slime Infested Land | Boggy, flooded, heavy water tiles. | Bog |
| Dark Jungle | Dense, claustrophobic, reduced sight radius. | Forest |
| Bandit Camp | Hostile humans, Black Market run by their leader. | Camp |
| Ancient Ruins | Small Temple outpost, high-risk/high-reward loot. | Temple |

### Rest Point System
- **Temple Rest Point** (always at spawn): campfire (short rest), stash box (deposit only), notice board
- Additional rest points randomly placed in large zones before zone bosses

---

## Part 2: Quest Scenarios (independent — each has technical prerequisites)

### 0. Standard Floor
Baseline floor, no special events. BSP or cellular automata, standard enemies/chests.
- **Prerequisites:** None — this is what exists today.

### 0.5. Camp / Rest Stop
Rare peaceful floor with no hostile enemies. Central campfire interactable (short rest). May spawn a traveling merchant.
- **Prerequisites:** Short rest mechanic, campfire interactable type, merchant NPC.

### 1. Prison Rescue
- Long central corridor with 3x3 cell rooms on either side
- One cell holds a captive NPC behind a locked door
- Player must find the Jailer (mini-boss) for the key, or use thieves' tools
- Enemies use Patrol AI (walk corridors instead of standing still)
- **Reward:** High-tier loot or permanent town merchant
- **Prerequisites:** Locked door + key system (partially built — `door-entity.ts` exists), Patrol AI behavior, NPC rescue interaction, key item type.

### 2. Underground Black Market
- Large open cavern (cellular automata), market stalls, neutral NPCs selling rare gear
- Player can buy or attempt to steal (stealth/thievery check)
- **If detected:** Lockdown — merchants teleport away, elite guards spawn at exits, escape sequence
- **Prerequisites:** Neutral NPC faction (confirmed in `gameplay.md`), steal/thievery check, dynamic faction switching (Neutral → Hostile), merchant inventory system, dynamic enemy spawning.

### 3. Monster Nest
- One massive room (3x normal max size), 15+ monsters, egg clusters
- **Hive Mind:** If any monster yells, every monster on the floor aggros
- **Terrain:** Sticky webs / deep mud (half speed for player, ignored by natives)
- **Tactical approach:** Stealth bypass, or trigger from a 1-tile choke point
- **Prerequisites:** Alert chaining / hive-mind aggro system, terrain movement modifiers (per-tile speed), stealth system.

### Implementation Priority
Based on prerequisites, a likely build order:
1. **Camp / Rest Stop** — simplest, just needs campfire interactable
2. **Prison Rescue** — door/key system is partially built
3. **Monster Nest** — needs terrain modifiers + alert chaining
4. **Black Market** — most complex, needs steal system + dynamic spawning

---

## Part 3: UI Concepts (depends on power-system.md)

> **⚠ Dependency:** This entire section only applies if the Soul Core system (Model 1) is adopted from [power-system.md](power-system.md). If a different model is chosen, these UI concepts are invalid and would need redesigning.

### Soul Bar HUD
3-slot widget, always visible:
- Slot 1 (Red) — Weapon Core
- Slot 2 (Blue) — Armor Core
- Slot 3 (Yellow) — Accessory Core

### Visual States
1. **Empty:** Faint grey circle
2. **Equipped / Inactive (level too low):** Gem visible but greyed, lock icon, "Lv 10" overlay
3. **Equipped / Active (no conduit):** Full color but blinks slowly (need matching equipment)
4. **Fully Active:** Glows and pulses in its color

### "Ability Waking Up" Moment
On hitting Lv 10 or 20: light burst from character, sound effect, gem icon "ignites" on HUD. Banner: *"Fire Core Tier 2 Awakened: Exploding Palm Unlocked!"*

### Item Conduit View
Inspecting dungeon gear shows "Conduit Capacity: Tier 2" instead of raw sockets. Preview shows which gem abilities this item would activate.

### Town Loadout Screen
- Left panel: The Vault (all cores + blueprints)
- Right panel: The Soul Bar (3 active slots for next run)
- Drag-and-drop to set starting loadout

### Death Screen
Shows lost Soul Cores count and Grave location on minimap. Permanent "Soul Icon" marks Grave for corpse run.

---

## Open Questions

- [ ] Does the "summoned by Temple" lore replace or extend the current story-setting?
- [ ] Which quest scenario should be built first? (Camp/Rest Stop is simplest)
- [ ] Should scenarios be built as hand-crafted stages or generator blueprints?
- [ ] Can the UI section be designed generically (for any power system), or should it wait until the power-system decision is made?
- [ ] How do rest points interact with the existing extraction flow?

## Dependencies

- Part 1 (lore): **independent** — needs reconciliation with `story-setting.md`
- Part 2 (scenarios): **independent** — each has its own technical prerequisites listed above
- Part 3 (UI): depends on [power-system.md](power-system.md) → Model 1
