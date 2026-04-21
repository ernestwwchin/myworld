# Inventory & Run Economy Brainstorm

Status: raw
Date: 2026-04-21
Source: design discussion

---

## Inventory System

### Slot-Based with Stacking

```
Base inventory: 10 slots
STR bonus: (STR mod) extra slots

STR 8-9:   9 slots
STR 10-11: 10 slots
STR 12-13: 11 slots
STR 14-15: 12 slots
STR 16-17: 13 slots
STR 18-20: 14 slots
```

### Stacking Rules

- Same potion type: stack to 3 per slot
- Same scroll type: stack to 3 per slot
- Weapons: no stack (1 each)
- Equipment: no stack (1 each)
- Synthesis Hammers: stack to 3
- Slot Chisels: stack to 3
- Gold: separate counter (no slot)
- Quest items: separate log (no slot)

### What Doesn't Use Slots

- Equipped items (weapon, off-hand, armor, ring, amulet)
- Gold
- Quest items (keys, etc.)
- Map/compass (if any)

### Stash (Town)

- 20 slots (expandable via NPC rescue or town upgrade?)
- Safe from death
- Used for: spare weapons (synthesis fuel), identified potions, Synthesis Hammers, extra equipment

---

## Death Penalty

- Lose ALL carried inventory items
- Lose 30% of carried gold
- Equipped gear: KEPT (weapon, armor, shield, ring, amulet survive)
- Stash: unaffected
- Character level: kept
- Permanent buffs (stat shrines, heart crystals): kept
- ★ refinement on equipped weapon: kept
- Curses on character: kept (not cleansed by death)

---

## No Hunger System

HP attrition from combat + inventory fullness = the natural run clock.

Pressure sources that replace hunger:
- HP drains from fights (need potions = limited supply)
- Inventory fills up (must leave to stash/merge)
- Carrying good drops = risk of dying and losing them
- Cursed items taking slots
- Limited synthesis hammers (can't merge everything)

If soft timer needed later: torch/light system (vision shrinks over time, ties into existing fog system).

---

## Carry Pressure Creates Decisions

```
Inventory 9/10. Find a weapon with good ability.

Options:
a) Drop a potion stack (risky — might need healing)
b) Drop spare weapon for synthesis (waste a future merge)
c) Use Synthesis Hammer NOW (forced timing)
d) Leave the new weapon (might regret forever)
```

10 slots is tight enough that every pickup forces a decision.

---

## Resource Rarity Tiers

```
COMMON:     Slot Chisel, temp buffs, low-tier weapon drops, basic potions
UNCOMMON:   Good abilities on weapons, scrolls of identify
RARE:       Synthesis Hammer, high-tier base weapons, scrolls of blessing
VERY RARE:  Unique weapons, permanent stat shrines, Scroll of Insight
```

Synthesis Hammer is the king resource. Everything else serves it.

---

## Gold Economy (To Be Designed)

### Sources
- Enemy drops
- Chest gold
- Selling items (to whom? Town shop?)
- Quest rewards

### Sinks
- Blacksmith: ★ refinement (scaling cost, biggest sink)
- Blacksmith: Slot Chisel purchase (1 per run)
- Blacksmith: Repair broken items
- Shop: Synthesis Hammer (expensive, 1 per world)
- Shop: Basic potions/scrolls
- Temple: curse cleansing
- Sage NPC: identification (gold per item)
- Town: stash expansion?

### Death Gold Loss
- Lose 30% of CARRIED gold on death
- Stash gold: safe? Or no separate gold storage?

---

## Extraction (To Be Designed)

How does the player leave a run safely?

Options considered but not decided:
- Stairs at end of each floor → go deeper or exit?
- Escape Scroll (consumable) → teleport to town
- Fixed exit every N floors (rest floor)
- Complete the world boss → auto-extract with bonus

---

## Leveling (To Be Designed)

Current game has leveling system. Key questions:
- Persistent levels (keep XP across runs) — matches weapon persistence
- Level cap?
- What does leveling give? (HP, stat points, ability unlocks?)
- Does this overlap with permanent world events (+1 stat shrines)?

---

## Run Structure (To Be Designed)

Questions to answer:
- How many floors per world?
- Rest floors (safe, no enemies)?
- Shop floors (mid-dungeon vendor)?
- Event floors (scripted encounters)?
- Boss floor (end of world)?

---

## Key Design Decisions Made

1. ✅ No hunger — HP attrition is the clock
2. ✅ 10 + STR inventory slots
3. ✅ Stack consumables to 3
4. ✅ Equipped gear survives death
5. ✅ Inventory lost on death
6. ✅ Stash is safe
7. ✅ Synthesis Hammer is the bottleneck resource (not slots)
8. ❓ Extraction method — TBD
9. ❓ Gold economy balance — TBD
10. ❓ Leveling — TBD
11. ❓ Floor structure — TBD
