---
tags: [myworld, ideas, classes, meta]
created: 2026-04-20
status: open
decision: "Vessel/class system with mastery multipliers, and town-hub meta-progression?"
---

# Open Decision: Classes & Meta-Progression

> **Key question:** Should the game add a class system with soul-core mastery multipliers? What does the town hub offer for long-term progression?

## Context

**Current confirmed design** ([gameplay.md](../design/gameplay.md)):
- Single starting class: Fighter. Others planned: Wizard, Cleric, Ranger.
- D&D 5e stats: STR, DEX, CON, INT, WIS, **CHA** (6 ability scores).
- Town hub has stash, shop (stub), quest board (stub).
- No meta-progression upgrades exist yet.

This doc has **two separable topics:**
1. **Class system** — base stats, stat growth, advanced classes. **Can work without soul cores.**
2. **Mastery multipliers + town upgrades** — only make sense if the Soul Core system is adopted (see [power-system.md](power-system.md)).

---

## Part 1: Class System ("Vessels") — independent of power system

### Concept
Players choose a class before entering the dungeon. Classes differ by starting stats and stat growth.

- **Switching:** Free and instant while in town
- **Same equipment rules:** All classes use the same inventory/equipment system

### Base Stats (Level 1)

> **⚠ Fix:** Added CHA column. The existing game uses all 6 D&D 5e ability scores — the original draft omitted CHA.

| Class | STR | DEX | CON | INT | WIS | CHA |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| Fighter | 16 | 12 | 14 | 8 | 10 | 10 |
| Wizard | 8 | 12 | 10 | 16 | 14 | 10 |
| Rogue | 10 | 16 | 10 | 12 | 8 | 14 |
| Cleric | 12 | 8 | 14 | 10 | 16 | 10 |

### Stat Growth
- Automatic per-level growth based on class weights
- Fighter: high STR/CON, Wizard: high INT/WIS, Rogue: high DEX/CHA, Cleric: high WIS/CON

> **Pacing note:** Stat growth rate is also a run-pacing lever — see [run-and-pacing.md](run-and-pacing.md) § Cross-cutting Pacing Mechanics.

### Advanced Classes (Unlockable)
Discovered as "Tomes" or rescued NPCs in dungeon.

- **Berserker:** High STR growth, low WIS
- **Spellblade:** Balanced STR/INT growth
- **Ranger:** High DEX/WIS growth

> **Note:** Advanced classes could also be implemented as 5e subclasses rather than a custom system — would keep closer to the D&D rules foundation.

---

## Part 2: Mastery Multipliers — requires Soul Core system

> **Dependency:** This section only applies if Model 1 (Soul Alchemist) is chosen in [power-system.md](power-system.md).

Each class is "attuned" to specific core colors. Multiplier applies to all gem effects of that color.

| Class | Red (Weapon) | Blue (Armor) | Yellow (Utility) |
| :--- | :---: | :---: | :---: |
| Fighter | **1.25x** | 1.0x | 1.0x |
| Wizard | 1.0x | 1.0x | **1.25x** |
| Cleric | 1.0x | **1.25x** | 1.0x |
| Rogue | **1.15x** | 1.0x | **1.15x** |

> **⚠ Note:** This is a custom mechanic on top of 5e. An alternative is to use 5e class features/subclass abilities to differentiate classes, which would be more consistent with the existing rules foundation.

### Advanced Class Mastery (if both systems adopted)
- **Berserker:** 1.4x Red, 0.8x Blue (glass cannon)
- **Spellblade:** 1.2x Red, 1.2x Yellow (hybrid)

---

## Part 3: Town Hub Meta-Progression

### What exists today
- Stash (deposit/withdraw items)
- Shop (stub — "Coming soon")
- Quest board (stub — "Coming soon")

### Proposed upgrades — soul-core dependent

| Building | Upgrade | Effect | Depends on |
|---|---|---|---|
| Ancient Temple | Soul Breadth | Unlock 2nd/3rd soul slots | Soul Cores |
| Ancient Temple | Soul Depth | Channel Tier 2/3 cores | Soul Cores |
| Ancient Temple | Soul Recovery | Auto-keep gems on death | Soul Cores + Corpse Run |

### Proposed upgrades — independent

| Building | Upgrade | Effect | Depends on |
|---|---|---|---|
| Blacksmith | Blueprint Refinement | Upgrade item blueprint tiers | Blueprint Pool system |
| Library | Rescued NPCs | New services (Alchemist, Cartographer, Lorekeeper) | NPC rescue quest scenarios |

### The Blueprint Pool (independent)
- Game starts with small loot pool (Rusty Dagger, Rags)
- Finding a Blueprint in dungeon adds that item to the global drop pool
- Each successful run expands what can drop in the next run
- **Overlaps with:** existing loot-table system in `ITEM_DEFS` — needs reconciliation

---

## Sample Data

See [samples/vessels.yaml](samples/vessels.yaml) for a YAML implementation of the class definitions.

---

## Open Questions

- [ ] Should classes be 5e subclasses or a custom vessel system?
- [ ] Can Part 1 (base classes) ship independently of the soul-core decision?
- [ ] Does the mastery multiplier add strategic depth, or is it just a flat stat bump?
- [ ] Should town upgrades be purchased (gold) or earned (quest completion)?
- [ ] Does the blueprint pool overlap too much with the existing loot-table system?
- [ ] How many advanced classes before it becomes bloat?

## Dependencies

- Part 1 (classes): **independent** — can be built now
- Part 2 (mastery): depends on [power-system.md](power-system.md) → Model 1
- Part 3 (town upgrades): mixed — some independent, some depend on soul cores
