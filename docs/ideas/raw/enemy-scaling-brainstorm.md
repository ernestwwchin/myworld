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

---

## W1 Creature YAML Definitions (Implementation Reference)

These are the concrete YAML blocks for coding. Stats match game-parameters.md.
Uses `extends:` for goblin variants (see mod-system-brainstorm.md).

### Core creatures (00_core/creatures.yaml)

```yaml
creatures:
  goblin:
    name: Goblin
    type: goblin
    icon: "👺"
    cr: "1/4"
    xp: 25
    hp: 7
    ac: 12
    speed: 3
    sight: 4
    fov: 120
    stats: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 }
    skillProficiencies: [stealth]
    attack: { weaponId: scimitar, dice: "1d6", range: 1 }
    gold: "2d4"
    ai: { profile: basic }
    lootTable: goblin_common

  wolf:
    name: Wolf
    type: wolf
    icon: "🐺"
    cr: "1/4"
    xp: 30
    hp: 11
    ac: 12
    speed: 4
    sight: 5
    fov: 180
    stats: { str: 12, dex: 15, con: 12, int: 3, wis: 12, cha: 6 }
    skillProficiencies: [perception]
    attack: { dice: "1d6+1", range: 1 }
    gold: 0
    ai: { profile: brute }
    lootTable: beast_drop
    # On-hit: STR save DC 11 or knocked prone

  spider:
    name: Spider
    type: spider
    icon: "🕷️"
    cr: "1/4"
    xp: 40
    hp: 8
    ac: 13
    speed: 2
    sight: 3
    fov: 360
    stats: { str: 6, dex: 14, con: 8, int: 1, wis: 10, cha: 2 }
    attack: { dice: "1d4+2", range: 1 }
    gold: 0
    ai: { profile: basic }
    lootTable: beast_drop
    onHit:
      save: { ability: con, dc: 12 }
      fail: { status: poisoned, duration: 3 }
    # Poisoned: -1 to attack rolls

  skeleton:
    name: Skeleton
    type: skeleton
    icon: "💀"
    cr: "1/4"
    xp: 50
    hp: 13
    ac: 13
    speed: 2
    sight: 5
    fov: 100
    stats: { str: 10, dex: 14, con: 15, int: 6, wis: 8, cha: 5 }
    attack: { weaponId: shortsword, dice: "1d6+2", range: 1 }
    gold: "1d6"
    ai: { profile: basic }
    lootTable: goblin_common
```

### Goblin Invasion creatures (01_goblin_invasion/creatures.yaml)

```yaml
creatures:
  # --- Tier 1 (B1F–B2F) ---

  goblin_archer:
    extends: goblin
    name: Goblin Archer
    xp: 35
    hp: 8
    ac: 13
    attack: { weaponId: shortbow, dice: "1d6+1", range: 6 }
    ai: { profile: ranged, preferredRange: 4, fleeRange: 2 }
    # inherits lootTable: goblin_common from goblin

  goblin_scout:
    extends: goblin
    name: Goblin Scout
    xp: 35
    hp: 10
    speed: 4
    ac: 13
    attack: { dice: "1d6+1", range: 1 }
    gold: "2d6"
    skillProficiencies: [stealth, perception]
    ai: { profile: basic, ambush: true }

  # --- Tier 2 (B2F–B3F) ---

  goblin_shaman:
    extends: goblin
    name: Goblin Shaman
    icon: "🧙"
    xp: 50
    hp: 12
    ac: 12
    stats: { str: 6, dex: 14, con: 10, int: 14, wis: 12, cha: 12 }
    skillProficiencies: [arcana, perception]
    attack: { dice: "1d6", range: 1 }
    gold: "3d6"
    ai: { profile: support }
    lootTable: goblin_shaman_drop
    abilities:
      - { id: heal_ally, trigger: "ally_below_50pct", cooldown: 3, heal: "2d6" }
      - { id: fire_bolt, trigger: "default", cooldown: 2, dice: "1d8", range: 5, damageType: fire }

  goblin_warrior:
    extends: goblin
    name: Goblin Warrior
    xp: 50
    hp: 15
    ac: 14
    stats: { str: 14, dex: 12, con: 14, int: 8, wis: 10, cha: 10 }
    attack: { weaponId: longsword, dice: "1d8", range: 1 }
    gold: "2d6"
    lootTable: goblin_elite

  goblin_trapper:
    extends: goblin
    name: Goblin Trapper
    xp: 45
    hp: 10
    ac: 13
    attack: { weaponId: shortbow, dice: "1d6+1", range: 6 }
    gold: "2d6"
    ai: { profile: ranged, preferredRange: 5, fleeRange: 2 }
    lootTable: goblin_elite
    # TODO: trap placement ability (post-MVP)

  cave_spider:
    extends: spider
    name: Cave Spider
    xp: 60
    hp: 16
    ac: 14
    attack: { dice: "1d8+1", range: 1 }
    onHit:
      save: { ability: con, dc: 13 }
      fail: { status: poisoned, duration: 3 }
    # inherits lootTable: beast_drop from spider

  # --- Tier 3 (B3F–B5F) ---

  hobgoblin:
    name: Hobgoblin
    type: hobgoblin
    icon: "⚔️"
    cr: "1/2"
    xp: 75
    hp: 20
    ac: 15
    speed: 2
    sight: 6
    fov: 120
    stats: { str: 14, dex: 12, con: 14, int: 10, wis: 10, cha: 10 }
    skillProficiencies: [athletics, perception]
    attack: { weaponId: longsword, dice: "1d8+2", range: 1 }
    gold: "3d6"
    ai: { profile: basic }
    lootTable: hobgoblin_drop
    features: [martial_advantage]
    # Martial Advantage: +2d6 damage if ally adjacent to target

  goblin_captain:
    extends: goblin_warrior
    name: Goblin Captain
    icon: "👑"
    cr: "1"
    xp: 100
    hp: 25
    ac: 15
    stats: { str: 14, dex: 12, con: 14, int: 10, wis: 10, cha: 12 }
    skillProficiencies: [athletics, intimidation, perception]
    attack: { weaponId: longsword, dice: "1d8+2", range: 1 }
    gold: "4d6"
    lootTable: hobgoblin_drop
    features: [second_wind, leadership]
    # Second Wind: heal self 1d10+level (once per combat)
    # Leadership: allies within 3 tiles get +1 to hit

  # --- Boss ---

  goblin_warlord:
    name: Goblin Warlord
    type: goblin
    icon: "💀👑"
    cr: "5"
    xp: 500
    hp: 150
    ac: 16
    speed: 4
    sight: 8
    fov: 180
    stats: { str: 18, dex: 12, con: 16, int: 12, wis: 14, cha: 14 }
    skillProficiencies: [athletics, intimidation, perception]
    attack: { weaponId: longsword, dice: "1d8+4", range: 1 }
    gold: "10d10"
    ai: { profile: boss }
    immunities: [stun, fear, charm]
    legendaryActions: 2
    lootTable: goblin_warlord_boss
    phases:
      - name: "The Commander"
        hpThreshold: 60   # Phase 1: 100%–60%
        ac: 18             # shield up
        attack: { weaponId: longsword, dice: "1d8+4", range: 1 }
        abilities:
          - { id: war_horn, trigger: "every_3_turns", summon: goblin, count: 2 }
        legendary:
          - { id: war_cry, cost: 1, effect: "allies +1 damage, 1 turn" }
          - { id: dodge, cost: 1, effect: "+2 AC until next turn" }
      - name: "No More Games"
        hpThreshold: 30   # Phase 2: 60%–30%
        ac: 14             # shield thrown
        attack: { weaponId: greataxe, dice: "2d10+5", range: 1 }
        multiAttack: 2
        abilities:
          - { id: kick_brazier, trigger: "phase_enter", fireTiles: 3, damage: "2d6" }
          - { id: charge, trigger: "target_distance_gt_3", range: 4 }
        legendary:
          - { id: charge, cost: 2, effect: "move 4 + attack" }
          - { id: battlecry, cost: 1, effect: "WIS DC 13 fear, 1 turn" }
      - name: "Berserk"
        hpThreshold: 0    # Phase 3: 30%–0%
        speed: 6
        attack: { weaponId: greataxe, dice: "2d10+7", range: 1 }
        multiAttack: 2
        abilities:
          - { id: ground_slam, trigger: "2_plus_adjacent", aoe: 1, dice: "2d8", knockback: 1 }
          - { id: relentless, trigger: "reduced_to_0", save: { ability: con, dc: 15 }, reviveHp: 1, uses: 1 }
```

### Floor Encounter Composition

| Floor | Enemies | Total Count | Theme |
|---|---|---|---|
| B1F | Goblin ×5, Goblin Archer ×2, Wolf ×1 | 8 | Easy intro, learn basics |
| B2F | Goblin ×4, Goblin Archer ×2, Goblin Scout ×2, Goblin Shaman ×1 | 9 | First caster, ambush scouts |
| B3F | Goblin ×3, Goblin Warrior ×2, Goblin Shaman ×2, Spider ×2, Hobgoblin ×1 | 10 | Harder mix, poison |
| B4F | Goblin Warrior ×2, Goblin Trapper ×2, Goblin Shaman ×2, Cave Spider ×2, Hobgoblin ×2, Goblin Captain ×1 | 11 | Toughest regular floor |
| B5F | Goblin Warlord ×1, Hobgoblin ×2 (guards), + phase 1 summons | 3+ | Boss fight |

### Encounter Pacing Notes

- B1F: ~2-3 rooms with enemies, rest are empty/loot. Teaches movement + basic attack.
- B2F: First ranged enemy (archer) teaches positioning. Shaman teaches focus-fire priority.
- B3F: Spider poison forces resource decisions (cure or push through). Hobgoblin is a damage check.
- B4F: Captain's Leadership buff makes grouped enemies dangerous. Trappers force movement.
- B5F: Boss only. Pre-boss rest opportunity. Arena with pillars, braziers, side doors.
