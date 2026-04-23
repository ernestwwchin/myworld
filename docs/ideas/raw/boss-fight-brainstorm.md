# Boss Fight System Brainstorm

Status: raw
Date: 2026-04-21
Source: design discussion

---

## Core Decisions

- **2-3 phases per boss** (HP thresholds change behavior)
- **Legendary actions** (boss acts between player turns, 2-3 per round)
- **Designed arenas** with tactical features (pillars, hazards, spawn doors)
- **Pre-boss preparation** (rest, inventory, companion swap before entering)
- **Cannot leave** once boss fight starts
- **Enrage timer** (soft, +2 damage/round after round 20)
- **Boss AI targets healers and finishes downed players** (ruthless)
- **Mini-bosses** in side dungeons (1-2 phases, lighter mechanics)

---

## Boss Structure: Phases

Every boss has 2-3 phases based on HP thresholds. Each phase changes the fight.

```
Phase 1 (100%-60%): "Normal" — boss uses standard tactics, may summon adds
Phase 2 (60%-30%):  "Desperate" — new mechanics activate, increased aggression
Phase 3 (30%-0%):   "Berserk" — full aggression, most dangerous
```

---

## Boss Mechanics Toolkit

### Summoning / Adds

| Mechanic | Example |
|---|---|
| Call reinforcements | Spawn N enemies every X turns |
| Raise dead | Revive fallen enemies as undead |
| Split | Boss splits into 2 weaker copies at 50% |

### Terrain / Positioning

| Mechanic | Example |
|---|---|
| Fire/poison tiles | Boss creates hazard zones, forces movement |
| Charge/leap | Boss jumps to a tile, damages area on landing |
| Pull/push | Boss pulls player toward it or pushes away |
| Collapsing floor | Tiles become impassable over time |
| Dark zones | Boss extinguishes light, limits vision |

### Damage Patterns

| Mechanic | Example |
|---|---|
| Telegraphed AoE | "Boss raises hammer" → next turn, 3×3 area smash. MOVE or take huge damage. |
| Multi-attack | Boss attacks 2-3 times per turn |
| Cleave | Hits all adjacent targets |
| Target switch | Ignores tank, charges healer/wizard |
| Execute | Bonus damage to targets below 25% HP |

### Defense / Immunity

| Mechanic | Example |
|---|---|
| Armor break | Must destroy shield/armor before dealing full damage |
| Immune phase | Boss is invulnerable, must kill adds or destroy object first |
| Reflect | Returns X% damage to attacker for N turns |
| Heal | Boss heals if you don't interrupt (kill the shaman, break the totem) |
| Enrage timer | If fight lasts too long, boss gets massive buff |

### Player-Targeting

| Mechanic | Example |
|---|---|
| Mark for death | Boss marks 1 target, massive damage in 2 turns unless companion intercepts |
| Companion snatch | Boss grabs a companion, must be freed (attack boss to release) |
| Fear aura | Companions must make WIS save or flee for 1 turn |
| Cage | Boss traps player in a zone, companions must break you out |

---

## Boss Stats (vs Normal Enemies)

| Stat | Normal Elite | Boss |
|---|---|---|
| HP | 30-60 | **100-200+** (multi-phase) |
| AC | 14-16 | 15-18 |
| Attacks/turn | 1 | **2-3** (multi-attack) |
| Damage | 1d8+3 | 2d8+5 per hit |
| Actions | Standard | **Legendary actions** (acts between player turns) |
| Movement | Normal | Can charge/leap |
| Targeting | Nearest | **Smart** (targets healers, downed player) |
| Immune | — | Immune to stun, fear, some status effects |

---

## Legendary Actions

Bosses get extra actions between player/companion turns. Prevents "team acts 3 times then boss acts once."

```
Example: Goblin Warlord — 2 Legendary Actions per round

Between any turn:
  [1 action] War Cry: +1 damage to all goblin allies for 1 turn
  [1 action] Dodge: +2 AC until next turn
  [2 actions] Charge: Move 4 tiles + attack
```

---

## W1 Boss: Goblin Warlord (Full Design)

```
GOBLIN WARLORD
  HP: 150
  AC: 16 (plate + shield)
  Damage: 2d8+4 (greataxe) or 1d8+4 (sword + shield bash)
  Speed: 4 tiles
  Legendary Actions: 2 per round
  Immune: Stun, Fear, Charm
```

### Phase 1 — "The Commander" (150-90 HP)

- Stands behind goblin guards (2 Hobgoblins start with him)
- Every 3 turns: blows War Horn → 2 Goblins spawn from side doors
- Uses shield, fights defensively (AC 18 with shield up)
- Legendary: War Cry (+1 damage to allies) or Dodge (+2 AC)

**Player goal:** Kill adds, get through to the boss.
**Companion role:** Fighter holds adds, Ranger/Wizard damage boss.

### Phase 2 — "No More Games" (90-45 HP, triggered at 60%)

Transition: "ENOUGH!" — Warlord throws shield, grabs greataxe.
- Shield removed: AC 16→14
- Damage increases: 2d8+4 → 2d10+5
- Gains multi-attack: attacks TWICE per turn
- Kicks over braziers → 3 random tiles become fire (2d6 damage/turn)
- Stops summoning. Fights personally.
- Charges toward lowest-HP target
- Legendary: Charge (move 4 + attack) or Battlecry (fear check, WIS DC 13)

**Player goal:** Avoid fire tiles, manage increased damage.
**Companion role:** Cleric healing hard, Fighter tries to block charges.

### Phase 3 — "Berserk" (45-0 HP, triggered at 30%)

Transition: Warlord roars, eyes glow red.
- +2 damage on all attacks
- Moves 6 tiles per turn (fast)
- Acts 3 times per round (2 attacks + 1 legendary)
- Random charge: picks random target, charges across arena
- Ground Slam: AoE 1-tile radius around boss, 2d8 damage, knockback
- Relentless: if reduced to 0 HP, CON save DC 15. Success = revives at 1 HP ONCE.

**Player goal:** Survive the onslaught. Burst him down.
**Companion role:** Everyone attacks. Cleric keeps people alive.

---

## Boss Arena Design

Bosses fight in designed rooms with tactical features:

```
GOBLIN WARLORD ARENA:

  ┌──────────────────────┐
  │ B B         . . B B  │  B = Brazier (fire hazard in Phase 2)
  │ . .  [H] . . [H] .  │  H = Hobgoblin guard
  │ . . . . . . . . . .  │  D = Side door (goblins spawn Phase 1)
  │D. . . . . . . . . .D │  W = Warlord (boss)
  │ . . . . [W] . . . .  │  P = Pillar (cover, blocks LoS)
  │ . . [P] . . [P] . .  │
  │ . . . . . . . . . .  │
  │ . . . . . . . . . .  │
  │       ENTRANCE        │
  └──────────────────────┘
```

| Feature | Tactical Use |
|---|---|
| Pillars | Block charge path, line-of-sight cover from ranged |
| Braziers | Phase 2: become fire tiles. Before: just decoration. |
| Side doors | Phase 1: goblin spawns. Fighter can block (choke point). |
| Open center | Boss has room to charge. Dangerous to stand in. |

---

## Pre-Boss Preparation

Before the boss door, player gets a chance to prepare:

```
[!] BOSS ROOM AHEAD

  "You hear war drums beyond the heavy iron door."

  > Enter boss room
  > Rest first (short rest: heal to full, restore cooldowns)
  > Check inventory
  > Change active companions

  (Cannot leave once entered)
```

---

## Boss Rewards

| Reward | Details |
|---|---|
| Milestone | +2 to any stat (player chooses, permanent) |
| Guaranteed drop | 1 weapon/armor from boss loot table (semi-fixed) |
| Boss material | Unique crafting material (companion ★ upgrades, post-MVP) |
| Gold | 200-500g |
| World unlock | Next world becomes accessible |
| Story | Cutscene/dialog, main quest progresses |

---

## Mini-Bosses (Side Dungeons)

| | World Boss | Mini-Boss |
|---|---|---|
| HP | 150-750 | 60-200 |
| Phases | 3-4 | 1-2 |
| Legendary actions | 2-3 | 0-1 |
| Arena | Designed room | Normal room, maybe 1 feature |
| Rewards | Milestone + guaranteed drop | Good loot, companion, or unlock |
| Frequency | 1 per world | 1-2 per world (side dungeons) |

### W1 Mini-Boss: Spider Queen

```
SPIDER QUEEN (side dungeon boss)
  HP: 80
  AC: 13
  Phases: 2
  Phase 1: Summons spiderlings, creates web tiles (halves movement)
  Phase 2 (50%): Venom spray (cone AoE poison), lunges at ranged targets
  Reward: Rare weapon + companion accessory
```

---

## Boss Difficulty Scaling

| World | Boss | HP | Phases | Legendary | Key Mechanic |
|---|---|---|---|---|---|
| W1 | Goblin Warlord | 150 | 3 | 2 | Adds + fire + charge |
| W2 | (TBD) | 250 | 3 | 2 | TBD |
| W3 | (TBD) | 400 | 3 | 3 | TBD |
| W4 | (TBD) | 550 | 3 | 3 | TBD |
| W5 | (TBD) | 750 | 4 | 3 | 4 phases for final boss |

---

## Enrage Timer

Soft enrage prevents infinite stalling:

```
Round 20: "The Warlord's fury intensifies!" +2 damage
Round 22: +4 damage
Round 24: +6 damage
...eventually unhealable
```

Forces player to deal damage, not just turtle with healing.

---

## Boss Fight + Companion Interactions

### Rescue Window in Boss Fights

Boss **always** attacks downed player (ruthless):

```
Player KO'd → Boss attacks downed player → window: 2 turns
  → Boss legendary action → attacks again → window: 1 turn
  → If Cleric doesn't reach you THIS turn → dead next round
```

### Companion Death Cascade

```
Phase 1: Full team (you + 2). Manageable.
Phase 2: Kira goes down. You + Torvin. Harder.
  Decision: Use Revivify now? (once/run)
  Decision: Use Revive Scroll? (rare consumable)
Phase 3: If Torvin goes down → solo vs berserk boss.
  Solo = no rescue window = instant death if you go down.
  But Lone Wolf buff (+15% damage) helps burst.
```

"Do I use my Revive now or save it?" = peak boss fight tension.

---

## Implementation Notes

### Boss Data (YAML)

```yaml
bosses:
  goblin_warlord:
    name: Goblin Warlord
    hp: 150
    ac: 16
    speed: 4
    immune: [stun, fear, charm]
    legendary_actions: 2
    phases:
      - trigger: 100%
        name: "The Commander"
        behavior: defensive
        abilities: [war_horn, shield_block]
        summon: { type: goblin, count: 2, interval: 3, doors: [left, right] }
        legendary: [war_cry, dodge]
      - trigger: 60%
        name: "No More Games"
        transition: "ENOUGH!"
        ac_change: -2
        weapon_change: greataxe
        multi_attack: 2
        abilities: [charge, kick_brazier]
        legendary: [charge, battlecry]
      - trigger: 30%
        name: "Berserk"
        damage_bonus: 2
        speed: 6
        multi_attack: 2
        legendary_actions: 3
        abilities: [random_charge, ground_slam]
        relentless: { dc: 15, uses: 1 }
    arena: goblin_warlord_arena
    rewards:
      milestone: { type: stat_bonus, amount: 2 }
      loot_table: boss_warlord_drops
      gold: "4d100+200"
      boss_material: warlord_trophy
      unlock: world_2
```

### Arena Data (YAML)

```yaml
arenas:
  goblin_warlord_arena:
    size: [12, 10]
    features:
      - { type: pillar, positions: [[3,5], [8,5]] }
      - { type: brazier, positions: [[1,0], [2,0], [9,0], [10,0]] }
      - { type: spawn_door, positions: [[0,3], [11,3]], phase: 1 }
    encounters:
      - { type: hobgoblin, positions: [[4,1], [7,1]] }
      - { type: goblin_warlord, position: [5,4] }
    entrance: [5, 9]
```

---

## Open Questions

- W2-W5 boss identities and mechanics?
- Exact legendary action economy (restore at start of round or deplete?)
- Can companions interact with boss mechanics (e.g. block spawn doors)?
- Boss music / visual transitions between phases?
- Do mini-bosses have unique arenas or just decorated rooms?
- Exact boss loot tables per world?
- Can you re-fight bosses? (For farming materials / helping others?)
