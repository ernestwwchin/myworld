---
tags: [gamedev, myworld, design, lore]
created: 2026-04-20
status: proposal
---

# World Lore & Backstory

## The Origin: The Ancient Temple

At the very beginning of time in this world, this land was a place of untamed danger — dark jungles, monster-infested ruins, and ancient, forgotten magic. At the heart of it all stood **The Ancient Temple**: a structure so old that no one knows who built it or why.

The Temple has one terrifying, irreversible function: **it summons characters from other worlds and deposits them here.**

There is no way to go back.

The people summoned by the Temple — humans, elves, dwarves, and other races — found themselves stranded in a hostile wilderness. With no way home, they did the only thing they could: **they survived.** Over generations, they cleared enough land, fought back enough monsters, and built a small but thriving settlement.

**That settlement is the Town Hub. The player is the most recently summoned character.**

This backstory answers fundamental questions that the player will have:
- **Why am I here?** The Temple brought you.
- **Why can't I go home?** No one has ever found a way. The Temple only works one direction.
- **Why is everyone so tough?** Everyone in this village is a descendant of, or a direct summoned survivor from, the Temple. They have been fighting to exist here for generations.
- **What is the goal?** Push back the monsters far enough to reclaim the land, find out why the Temple summons people, and maybe, eventually, discover how to reverse it.

---

## The World Map (Act 1: The Frontier)

The first Macro-Floor represents the frontier zone directly surrounding the Town and the Ancient Temple. It is split into two categories of zones:

### Fixed Zones (Always Present)
These zones are always generated and always in roughly the same location relative to the Ancient Temple spawn point.

| Zone | Description | Biome |
|---|---|---|
| **The Ancient Temple** | The player's spawn point. A crumbling stone structure, still active and humming with magical energy. Contains a Rest Point (campfire) and a Stash Box (access to inventory). Connects to the next Act. | Temple |
| **The Goblin Cave** | A large cave system to the northwest. The goblins have established a warband here and are the primary threat to the Town. Contains the Goblin Warlord (Act 1 Boss). | Cave |
| **The Attacked Village** | An outlying farming settlement that the goblins have overrun. Contains captive villagers (Prison Rescue scenario) and clues to the Goblin Warlord's plan. | Ruins |

### Randomized Zones (Seed-Driven)
The Seed picks 2-3 of these zones to fill in the "unexplored wilderness" areas of the map between the fixed zones. Each run will feel different.

| Zone | Description | Biome |
|---|---|---|
| **The Abandoned Village** | A ghost town of a previous wave of settlers. May contain traps, lost loot chests, and Cursed Shrine events. | Ruins |
| **The Abandoned Mine** | A collapsed mine full of Orcs and Giant Spiders. May contain a locked vault with rare ore-based loot. | Mines |
| **The Slime Infested Land** | A boggy, flooded area overrun with Slimes and Oozes. Heavy `water` tile generation. | Bog |
| **The Dark Jungle** | A dense, claustrophobic forest. Heavy use of `cellular_automata` generation. Sight radius reduced. Apex Predator scenario may spawn here. | Forest |
| **The Bandit Camp** | A group of hostile (non-goblin) humans who prey on other settlers. Contains a Black Market run by their leader. | Camp |
| **The Ancient Ruins** | A smaller, crumbled outpost of the same civilization that built the Temple. Contains high-risk, high-reward loot. | Temple |

---

## The Rest Point System

Because the Macro-Floor is enormous (Diablo 2 Act scale), the player needs recovery points within the map itself. Rest Points are **not a full rest** — they represent a "Short Rest" in D&D 5e terms.

**The Ancient Temple Rest Point** (fixed, always at spawn) contains:
- A **Campfire**: Interact to take a Short Rest (recover HP based on Hit Dice, recover some spell slots).
- A **Stash Box**: Access to the player's Town Stash (read-only in the field — you can view items but not withdraw; you can deposit items to free up inventory space).
- A **Notice Board**: Displays any active quests or clues discovered for the current run.

Additional rest points may be randomly placed in large zones (e.g., a small campfire inside the Abandoned Mine) to give the player breathing room before a zone boss.
