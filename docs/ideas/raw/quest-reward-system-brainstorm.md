# Quest & Reward System Brainstorm

Status: raw
Date: 2026-04-21
Source: design discussion

---

## Core Decisions

- **3-layer quest system** (main quest, world quests, contracts)
- **Story chains deferred** — not MVP
- **Fixed + random + semi-fixed rewards** — multiple loot models
- **Reputation system** — persistent, never lost, unlocks better contracts
- **Escort NPCs** use companion AI with command-only control
- **Loot tables** are YAML-driven and tier-based

---

## Three Quest Layers

### Layer 1: Main Quest (Always Active)

One overarching goal per world. Always present, can't be declined.

```
W1 MAIN QUEST: "Defeat the Goblin Warlord"
  - Automatically active when you enter W1
  - Progress: clear zones → reach boss → kill boss
  - Reward: +2 to any stat (milestone), unlock W2, story progression
```

| Aspect | Rule |
|---|---|
| Per world | 1 main quest |
| Activation | Automatic |
| Can decline | No |
| Reward | Milestone stat bonus + world unlock |
| Failure | Doesn't fail — just incomplete until you beat the boss |

### Layer 2: World Quests (Discover in Zones)

3-5 side quests per world. Found by exploring. Zone-tied (not branch-tied).

```
W1 WORLD QUESTS:
  "The Wounded Priest" — Find Torvin in Zone 2, escort him to waypoint
    Reward: Torvin joins as companion
  
  "The Deserter" — Help Grik escape the goblin warren
    Reward: Grik joins as companion

  "Lost Patrol" — Find 3 militia bodies, return dog tags to town
    Reward: 200g + unlock Sellsword at town

  "Poison the Well" — Destroy goblin poison supply in Zone 3
    Reward: Remove poison modifier from Zone 4
```

| Aspect | Rule |
|---|---|
| Per world | 3-5 quests |
| Activation | Discover in dungeon (find NPC, item, location) |
| Zone-tied | Quest is in a specific zone, not tied to branch path |
| Persistence | Permanent once discovered — survives death, can complete on later runs |
| Reward | Companion, gold, unlock, zone modifier removal |

### Layer 3: Contracts (Quest Board)

Pick from a board at town. Per-run. Reputation unlocks better ones.

```
QUEST BOARD (Town):
  Available contracts (pick up to 3):
  
  [Kill 10 Goblins]         — 50g          (tier 1)
  [Clear Zone 2]             — 100g         (tier 1)
  [Find the Hidden Cache]    — 75g + potion (tier 2, rep 5+)
  [Slay the Elite Hobgoblin] — 200g + rare  (tier 3, rep 15+)
  [Escort the Merchant]      — 300g         (tier 3, rep 15+)
```

| Aspect | Rule |
|---|---|
| Per run | Pick 3 from 3-5 offered |
| Activation | Take from quest board |
| Per-run only | Fail on death, new selection next run |
| Reputation gated | Better contracts unlock at higher rep |
| Reward | Stated upfront (gold, items, specific gear) |

---

## Reputation System

Completing contracts builds town reputation. Persists across runs, never lost.

| Reputation | Tier | Contract Quality |
|---|---|---|
| 0-4 | Newcomer | Basic kill/fetch quests, small gold rewards |
| 5-14 | Known | Better rewards, exploration quests |
| 15-29 | Trusted | Escort quests, rare item rewards |
| 30-49 | Respected | Elite bounties, unique gear rewards |
| 50+ | Legend | Legendary contracts, boss material rewards |

### Rep Gain

| Action | Rep Gained |
|---|---|
| Complete tier 1 contract | +1 |
| Complete tier 2 contract | +2 |
| Complete tier 3 contract | +3 |
| Complete world quest | +5 |
| Beat world boss | +10 |

---

## Escort Quest Mechanics

Escort NPCs are **temporary allies** controlled via command system (NOT direct control).

```
ESCORT: "Save the Merchant"
  Merchant joins group temporarily.
  Cannot directly control.
  
  Commands available:
    [Follow Me] — stays behind you
    [Hide Here] — stays on tile, crouches
    [Run to Exit] — beelines for exit
    [Fall Back] — moves away from enemies

  Merchant AI: panicked, not a fighter, runs from enemies.
  Your job: protect him while he follows/hides/runs.
  
  If Merchant KO'd → quest fails (can retry next run)
```

---

## Reward System

### Three Reward Models

| Type | When | Examples |
|---|---|---|
| **Fixed** | Boss kills, quest completion | +stat milestone, specific companion, specific unlock |
| **Random** | Enemy drops, chests, furniture | Loot table rolls |
| **Semi-fixed** | Boss guaranteed drop type | Boss always drops a weapon, but which weapon is random |

### Fixed Rewards

| Source | Reward |
|---|---|
| World boss | +2 to any stat (milestone) + world unlock + 1 guaranteed drop type |
| World quest | Specific: companion, unlock, zone effect removal |
| Contract | Stated upfront: gold amount, sometimes specific item |

### Random Rewards (Loot Tables)

All random drops use YAML loot tables:

```yaml
loot_tables:
  goblin_common:
    rolls: 1
    entries:
      - { item: gold, amount: "2d6", weight: 50 }
      - { item: rusty_dagger, weight: 20 }
      - { item: healing_herb, weight: 15 }
      - { item: nothing, weight: 15 }
  
  chest_zone_1:
    rolls: 2
    entries:
      - { item: gold, amount: "4d6", weight: 30 }
      - { item: healing_potion, weight: 25 }
      - { table: weapon_common, weight: 15 }  # sub-table
      - { table: armor_common, weight: 10 }
      - { item: binding_stone_crude, weight: 10 }
      - { item: scroll_identify, weight: 10 }
  
  weapon_common:
    rolls: 1
    entries:
      - { item: shortsword, weight: 25 }
      - { item: mace, weight: 25 }
      - { item: shortbow, weight: 20 }
      - { item: quarterstaff, weight: 15 }
      - { item: dagger, weight: 15 }
    modifiers:  # rolled on top of base item
      enhancement: { none: 70, "+1": 25, "+2": 5 }
      star: { range: [-3, 5], distribution: normal }
      abilities: { slots_0: 50, slots_1: 35, slots_2: 15 }
      buc: { blessed: 5, uncursed: 80, cursed: 15 }
```

### Semi-Fixed Rewards

Boss always drops specific category, random specific item:

```
Goblin Warlord drops:
  1× weapon (random from boss_weapon_table — always a weapon, which one varies)
  1× gold (200-500g)
  1× boss_material (for companion upgrades)
```

### Loot Tiers

| Tier | Color | Source |
|---|---|---|
| Trash | Gray | Common enemies |
| Common | White | All enemies, basic chests |
| Uncommon | Green | Elites, good chests |
| Rare | Blue | Champions, quest rewards, boss drops |
| Boss | Purple | World boss only |

### Drop Rate Pacing (Per Full W1 Run)

| Category | Expected Drops |
|---|---|
| Weapons | ~12 |
| Armor pieces | ~8 |
| Consumables (potions/scrolls) | ~20 |
| Gold | ~1000g total |
| Companion accessories | ~3-4 |
| Rare items | ~2-3 |
| Boss items | 1-2 (guaranteed) |

---

## BG3-Style Stat System

### Character Creation: 27-Point Buy

Standard 5e point-buy rules. All stats start at 8, spend 27 points:

| Score | Point Cost |
|---|---|
| 8 | 0 |
| 9 | 1 |
| 10 | 2 |
| 11 | 3 |
| 12 | 4 |
| 13 | 5 |
| 14 | 7 |
| 15 | 9 |

Range: 8-15 at creation. No stat above 15 before milestones.

### Suggested Arrays Per Class

| Class | STR | DEX | CON | INT | WIS | CHA | Focus |
|---|---|---|---|---|---|---|---|
| Fighter | 15 | 10 | 14 | 8 | 10 | 10 | STR + CON |
| Ranger | 10 | 15 | 12 | 8 | 14 | 8 | DEX + WIS |
| Cleric | 12 | 10 | 14 | 8 | 15 | 8 | WIS + CON |
| Wizard | 8 | 14 | 10 | 15 | 12 | 8 | INT + DEX |

Players can deviate — a CHA 14 Fighter "Warlord" with 3 companion slots is valid.

### Milestone Bonuses (Separate from Point-Buy)

+2 to a stat of your choice at each milestone. **Permanent, non-respecable.**

| Milestone | When | Bonus |
|---|---|---|
| 1st | W1 boss killed | +2 to any stat |
| 2nd | W3 boss killed | +2 to any stat |
| 3rd | W5 boss killed | +2 to any stat |

Total: +6 stats across the full game. Separate layer on top of point-buy.

### Respec at Town

| Respec Type | Cost | What Changes |
|---|---|---|
| **Stat + Skill respec** | 200g | Redistribute 27 points + re-pick skill choices. Same class. |
| **Class change** | 500g | Change class entirely. Incompatible gear unequipped. Stats redistributed. |

Milestones are NEVER respeced — permanent layer always applied on top.

```
Example:
  Original: Fighter, STR 15, DEX 10, CON 14 + milestone +2 STR = STR 17
  Respec (200g): STR 12, DEX 14, CON 14 + milestone +2 STR = STR 14
  
  Milestone +2 STR is locked. You can only move the 27 base points.
  
  Class change (500g): Wizard, INT 15, DEX 14, CON 10 + milestone +2 STR = STR 10 (milestone wasted on non-primary)
```

This means milestone allocation matters — choose wisely, they're forever.

---

## Open Questions

- Exact world quest list for W1?
- Contract generation algorithm (from pool or hand-authored)?
- How does reputation display in UI?
- Can you abandon a contract mid-run?
- Do world quests expire if you move to next world without completing?
- Exact loot table balance numbers?
- How many contracts refresh per run (all new, or some carry over)?
