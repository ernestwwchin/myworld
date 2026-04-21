# Enemy Scaling Brainstorm

Status: raw
Date: 2026-04-21
Source: design discussion

---

## Core Decision

**Fixed enemies per floor + Elite/Champion system. No scaling to player.**

- Enemies are hand-designed, YAML-driven, per-stage
- Map loot table controls enemy composition (same as weapon drops)
- Player FEELS power growth (earlier enemies become trivial — that's rewarding)
- Elites/Champions add per-floor variance and challenge
- Late worlds have harder base enemies, not scaled-up early ones

---

## Enemy Power Curve

| World | Enemy AC | Enemy HP | Enemy to-hit | Enemy damage | Player expected DPR |
|---|---|---|---|---|---|
| W1 early | 12-13 | 7-15 | +3-4 | 1d6-1d8 | ~10-15 |
| W1 late | 14-15 | 20-35 | +5 | 1d8-2d6 | ~20-25 |
| W2 | 15-16 | 30-50 | +6-7 | 2d6-2d8 | ~30-40 |
| W3 | 16-18 | 50-80 | +7-8 | 2d8-3d6 | ~50-60 |
| W4 | 18-19 | 70-100 | +8-9 | 3d6-3d8 | ~70-80 |
| W5 | 19-21 | 90-130 | +9-11 | 3d8-4d6 | ~90-100 |

Curve designed so that:
- Without gear investment: World 3+ is very hard
- With ★15 weapon: bonus 1d10 damage closes the gap
- With DR (heavy armor ★15): makes World 5 enemies survivable

### DR Relevance Check

```
World 5 enemy deals: 3d10 (avg 16.5) per hit
  No DR:                          take 16.5
  ★15 heavy armor (DR 1d10):     take ~11 (manageable)
  ★15 armor + ★15 shield (2d10): take ~5.5 (full tank build shines)
```

---

## Elite / Champion System

| Type | HP | Bonus | Drop bonus | Spawn rate |
|---|---|---|---|---|
| Normal | 1× | — | Normal loot table | 80% |
| Elite | 2× | +2 to hit, +1d6 damage | +1 rarity on drops | 15% |
| Champion | 3× | +3 to hit, +2d6 damage, 1 special ability | Guaranteed rare drop | 5% |

### Champion Special Abilities (Examples)

| Ability | Effect |
|---|---|
| Berserker | Enrages at 50% HP (double attacks) |
| Shielded | DR 5 until shield broken (targeted attack to break) |
| Summoner | Spawns 2 minions at 50% HP |
| Cursed | On-hit: ★-1 to target's weapon |
| Draining | On-hit: target loses XP (not a level, just progress) |
| Regenerating | Heals 10% HP per turn unless fire damage applied |
| Teleporting | Blinks to random tile each turn |
| Reflecting | 50% chance to reflect spell damage back |

Champion abilities are YAML-defined — moddable, composable.

---

## Enemy Data Model (YAML)

```yaml
enemies:
  goblin:
    hp: 7
    ac: 12
    toHit: 3
    damage: 1d6
    xp: 25
    loot: [dagger, leather, gold_small]

  goblin_chief:
    hp: 45
    ac: 15
    toHit: 5
    damage: 2d6
    xp: 100
    loot: [longsword, chain_shirt, gold_medium]
    abilities: [multi_attack]

  shadow_knight:
    hp: 65
    ac: 17
    toHit: 7
    damage: 2d8
    xp: 200
    loot: [beam_saber, splint, gold_medium]
    abilities: [multi_attack, parry]

  void_lord:
    hp: 120
    ac: 20
    toHit: 10
    damage: 3d10
    xp: 500
    loot: [plasma_edge, fortress_plate, gold_large]
    abilities: [multi_attack, teleport, curse_strike]
```

---

## Stage Enemy Composition (Map-Defined)

```yaml
stages:
  goblin_warren_floor_1:
    encounters:
      - { type: goblin, count: 3 }
      - { type: goblin_archer, count: 1 }

  goblin_warren_floor_5:
    encounters:
      - { type: goblin, count: 4, elite_chance: 0.1 }
      - { type: goblin_archer, count: 2 }
      - { type: goblin_chief, count: 1, elite_chance: 0.3 }

  crystal_depths_floor_3:
    encounters:
      - { type: shadow_knight, count: 2, elite_chance: 0.15 }
      - { type: crystal_golem, count: 1, champion_chance: 0.05 }
```

All map-defined. Mod authors control everything. No hardcoded scaling logic.

---

## Boss Design (Sketch)

Bosses are hand-designed, one per world (+ optional mid-bosses).

| Boss | World | HP | AC | Special |
|---|---|---|---|---|
| Goblin Warlord | W1 | 150 | 16 | Multi-phase, summons goblins, berserk at 30% |
| Shadow Lord | W2 | 300 | 18 | Teleports, curses weapons |
| Crystal Titan | W3 | 500 | 19 | AoE slam, shielded phases |
| Void Dragon | W4 | 750 | 20 | Breath weapon, flight, multi-phase |
| Final Boss | W5 | 1000 | 21 | TBD |

Bosses guarantee drops:
- 1 Synthesis Hammer
- 1 Slot Chisel
- 1 weapon (from boss weapon table)
- 1 boss material (for companion upgrades)
- Gold (200-500g, scales by world)
- Stat milestone: +2 to any stat (W1, W3, W5 bosses only)

---

## Open Questions

- Exact XP values per enemy? (needs level curve first)
- How many encounters per floor?
- Do enemies have elemental types/weaknesses?
- Flee mechanics — can you run from encounters?

---

## Enemy AI

Enemies are **predictable puzzles**, not intelligent opponents. Trigger-based, YAML-driven.

### AI Tiers

| AI Tier | Behavior | Used by |
|---|---|---|
| **Basic** | Move toward nearest target, attack when adjacent | Goblins, zombies, basic mobs |
| **Ranged** | Keep distance, shoot, flee if approached | Archers, mages |
| **Brute** | Charge straight line, heavy hit, slow | Ogres, golems |
| **Support** | Heal/buff allies, stay behind front line | Shamans, priests |
| **Boss** | Phase-based script (scripted sequence, not AI) | World bosses |

### Ability System (Trigger + Cooldown)

Enemies don't "think." They check conditions in priority order, do the first match.

```yaml
goblin_shaman:
  hp: 20
  ai: support
  abilities:
    - { id: heal_ally, trigger: "ally below 50% HP", cooldown: 3 }
    - { id: fire_bolt, trigger: "no ally needs healing", cooldown: 2 }

shadow_knight:
  hp: 65
  ai: basic
  abilities:
    - { id: multi_attack, trigger: "adjacent to target", cooldown: 0 }
    - { id: parry, trigger: "was hit last turn", cooldown: 4 }

crystal_golem:
  hp: 100
  ai: brute
  abilities:
    - { id: ground_slam, trigger: "2+ enemies in range", cooldown: 3 }
    - { id: charge, trigger: "target distance > 3", cooldown: 4 }
```

### Design Principles

- Player can learn patterns → tactical depth
- Challenge from enemy **composition** (3 goblins + shaman + brute), not individual AI
- All abilities YAML-defined → moddable, no code needed
- Enemies do NOT use items (potions, scrolls) — keeps it simple
