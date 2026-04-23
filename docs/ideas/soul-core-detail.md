---
tags: [myworld, ideas, items, magic]
created: 2026-04-20
status: open
parent: power-system.md
decision: "If Model 1 (Soul Alchemist) is chosen, how does the Soul Core system work?"
---

# Soul Core System — Detailed Design

> **Prerequisite:** This design only applies if the Soul Alchemist model is chosen in [power-system.md](power-system.md).

---

## Core Concept

- **Soul Cores** = persistent "batteries" (source of power, survive between runs)
- **Equipment** = temporary "conduits" (wiring found in dungeon, lost on run end)
- **3 Slots:** Weapon (Red/Crimson), Armor (Blue/Azure), Accessory (Yellow/Golden)

## Three Dimensions of a Soul Core

| Dimension | Role | Logic |
| :--- | :--- | :--- |
| **Color** | Slot placement | Red → Weapon, Blue → Armor, Yellow → Accessory |
| **Tier** | Ability count | Tier 1 (1 power), Tier 2 (2), Tier 3 (3) |
| **Roll** | Randomized pool | Specific abilities drawn from color's pool |

## Tiered Activation (Level Gate)

| Character Level | Active Abilities | Power State |
| :--- | :--- | :--- |
| Lv 1+ | 1st Ability | Standard |
| Lv 10+ | 2nd Ability | Mid-run spike |
| Lv 20+ | 3rd Ability | Endgame |

> **Note:** The Lv 10/20 gates assume the proposed run-progression XP curve (see [run-and-pacing.md](run-and-pacing.md)). In the current 10-floor model, player levels cap much lower — these thresholds would need adjusting.

## Stacking & Synergy

- **Linear:** +1d6 Fire (gem) + +1d6 Fire (sword) = +2d6 Fire total
- **Synergy pairs:** Slow Gem + Sword of Execution (bonus damage to slowed) encourages build-crafting

> **⚠ Refinement needed:** Original draft mixed dice notation (1d6) with percentage notation (+10% Fire). Since the game uses 5e dice math, all effects should use dice or flat bonuses, not percentages.

## Blueprint Interaction

- **Discovery:** Finding a Core Blueprint unlocks its drop pool
- **Upgrading:** Gold in town increases max tier of that blueprint

---

## Ability Pools

### Crimson Cores (Weapon Slot) — Damage / Offense

| Ability | Tier | Effect | Balance Notes |
| :--- | :---: | :--- | :--- |
| Cinder Strike | 1 | +1d6 Fire damage to attacks | OK — matches 5e Hex/Hunter's Mark |
| Vampiric Edge | 1 | Heal 2 HP on hit | OK — minor sustain |
| Whirlwind | 2 | Attack all adjacent for weapon damage −2 | OK — comparable to 5e Cleave |
| Chain Lightning | 2 | 20% on-hit: 1d8 to 3 nearby enemies | OK — proc-based |
| Dragon's Breath | 3 | 3x3 cone, 4d6 Fire (save for half) | ⚠ Reduced from 6d6 — 6d6 is Fireball tier, too strong for a passive |
| Executioner | 3 | +3d6 damage to enemies below 25% HP | ⚠ Changed from instant-kill — original trivializes bosses |

### Azure Cores (Armor Slot) — Defense / Survival

| Ability | Tier | Effect | Balance Notes |
| :--- | :---: | :--- | :--- |
| Stone Skin | 1 | +2 AC | OK — equivalent to Shield of Faith |
| Regeneration | 1 | +1 HP every 3 turns | OK — minor sustain |
| Thorn Aura | 2 | Reflect 3 damage on melee hit received | OK |
| Iron Will | 2 | Advantage on saves vs Stun/Paralysis | ⚠ Changed from "immune" — full immunity is too strong |
| Phoenix Rebirth | 3 | Drop to 1 HP instead of 0, once per floor | OK — matches 5e Half-Orc Relentless |
| Guardian Shell | 3 | Resistance to all damage (half damage) | ⚠ Very strong — may need once-per-combat activation |

### Golden Cores (Utility Slot) — Movement / Resources

| Ability | Tier | Effect | Balance Notes |
| :--- | :---: | :--- | :--- |
| Swift Foot | 1 | +1 tile movement per turn | OK |
| Eagle Eye | 1 | +3 vision radius | ⚠ Removed "see through walls" — breaks fog of war, a core mechanic |
| Misty Step | 2 | Teleport 5 tiles (6-turn CD) | OK — matches 5e Misty Step |
| Midas Touch | 2 | +50% gold from kills | OK — economy boost |
| Chronos | 3 | +1 extra action this turn (10-turn CD) | ⚠ Reduced from +2 turns — Action Surge is 1 extra, not 2 |
| Artifact Hunter | 3 | +15% chance for rare loot drops | OK — passive |

## Randomization Rules

1. Tier determines how many abilities roll (1/2/3)
2. Each ability drawn from its tier within the color pool
3. No duplicate abilities on one core
4. Synergy bonuses should be **visible to the player** in the UI, not hidden

> **⚠ Refinement:** Original draft used "Hidden Synergy" bonuses. Hidden mechanics are bad UX — players can't optimize around rules they can't see. Synergies should be displayed when previewing core combinations.

---

## Sample Data

See [samples/cores.yaml](samples/cores.yaml) for a YAML implementation of the ability pools.

> **Note:** The sample data still uses the original (pre-balance) values. It would need updating to match the balance notes above if this design is adopted.

---

## Known Issues & Dependencies

- **Depends on:** power-system.md (Model 1 must be chosen first)
- **Conflicts with:** Current loot-table system — blueprint discovery would need to integrate with `ITEM_DEFS` loading
- **Requires:** New `status-effect-system` entries for core effects, new UI widget (Soul Bar), save/load changes for persistent cores
- **Balance pass needed:** All numbers are first-draft; need playtesting against actual 5e encounter math
