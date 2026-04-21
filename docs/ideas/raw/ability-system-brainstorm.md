# Ability System Brainstorm

Status: raw
Date: 2026-04-21
Source: design discussion

---

## Core Decisions

- **Per-encounter abilities + per-rest spells** (NOT cooldowns — BG3 doesn't have cooldowns)
- **Known caster model** (like BG3 — learn spells permanently, spend slots to cast)
- **Cantrips are unlimited** (auto-scale with level)
- **Weapon abilities from equipped weapon** (per-encounter charges)
- **Reactions fire once per round each** (no wasted skills — each reaction fires once per round)
- **No ability upgrades** (no Cleave II — all abilities are different, auto-scale with level)
- **Trigger-time evaluation** (passive rules modify abilities at cast time, not pre-baked)

---

## Resource Model

### Per-Encounter Abilities

Charges reset after every combat encounter ends.

| Ability Type | Source | Charges | Reset |
|---|---|---|---|
| Maneuvers | Fighter class | 2-4 per encounter | After combat |
| Class Actives | All classes | 1-2 per encounter | After combat |
| Spell Modifiers | Wizard only | 1-2 per encounter | After combat |
| Weapon Abilities | Equipped weapon | 1-2 per encounter | After combat |

### Per-Rest Spells

Spell slots restored at rest (town return or waypoint rest).

| Class | Level 1 Slots | Level 2 Slots | Level 3 Slots | Total |
|---|---|---|---|---|
| Fighter | 2 | 0 | 0 | 2 |
| Ranger | 3 | 2 | 0 | 5 |
| Cleric | 4 | 3 | 2 | 9 |
| Wizard | 4 | 3 | 2 | 9 |

Spell slots scale with player level (start with fewer, gain more at key levels).

### Cantrips

- Each class gets 2 fixed class cantrips (always available)
- World cantrips: permanent, learned from tomes found in dungeons (any class can learn)
- Unlimited uses, auto-scale damage at levels 1/5/10

### Superiority Die (Fighter)

Maneuvers add a superiority die to their effects. Die scales with level:

| Level | Superiority Die |
|---|---|
| 1-4 | d6 |
| 5-8 | d8 |
| 9-10 | d10 |

---

## Ability Categories

### Cantrips (Unlimited)

**Class Cantrips (2 per class, fixed):**

| Class | Cantrip 1 | Cantrip 2 |
|---|---|---|
| Fighter | Strike (basic weapon attack) | Shove (push 1 tile) |
| Ranger | Quick Shot (basic ranged) | Careful Step (move 2, ignore traps) |
| Cleric | Sacred Flame (1d8 radiant, DEX save) | Guidance (+1d4 to ally's next roll) |
| Wizard | Fire Bolt (1d10 fire) | Ray of Frost (1d8 cold + slow) |

**World Cantrips (any class, learned from tomes):**

| Cantrip | Effect | Source |
|---|---|---|
| Light | 4-tile light radius, 10 turns | Tome in dungeon |
| Mage Hand | Interact at range (4 tiles) | Tome in dungeon |
| Minor Illusion | Place decoy, enemies attack it 1 turn | Tome in dungeon |

### Maneuvers (Fighter, Per-Encounter)

Use superiority die. 2-4 charges per encounter.

| Maneuver | Level | Effect |
|---|---|---|
| Trip Attack | 1 | Weapon + superiority die. STR save or prone. |
| Precision Attack | 2 | Add superiority die to attack roll (after seeing roll) |
| Menacing Attack | 3 | Weapon + superiority die. WIS save or frightened. |
| Pushing Attack | 4 | Weapon + superiority die. Push 2 tiles. |
| Disarming Attack | 6 | Weapon + superiority die. STR save or disarmed. |
| Sweeping Attack | 7 | Hit target + adjacent enemy takes superiority die damage. |
| Rally | 8 | Ally gains temp HP = superiority die + CHA mod. |

### Class Actives (Per-Encounter)

| Class | Ability | Level | Charges | Effect |
|---|---|---|---|---|
| Fighter | Second Wind | 1 | 1 | Heal 1d10 + level |
| Fighter | Action Surge | 2 | 1 | Extra action this turn |
| Ranger | Mark Target | 1 | 1 | Mark enemy, all attacks vs marked +2 to hit, 3 turns |
| Ranger | Camouflage | 5 | 1 | Hidden, next attack has advantage |
| Cleric | Turn Undead | 2 | 1 | WIS save or frightened 3 turns (undead in 3-tile radius) |
| Cleric | Preserve Life | 2 | 1 | Heal all allies below 50% HP, pool = 5 × level |
| Cleric | Divine Intervention | 10 | per-rest | Full heal + cleanse all allies |

### Spell Modifiers (Wizard Only, Per-Encounter)

| Modifier | Level | Charges | Effect |
|---|---|---|---|
| Twin Cast | 3 | 1 | Next single-target spell hits 2 targets |
| Empower Spell | 4 | 2 | Reroll spell damage dice, keep higher |
| Quicken Spell | 5 | 1 | Next spell doesn't consume action |

### Spells (Per-Rest, Use Spell Slots)

#### Level 1 Spells

| Spell | Class | Effect |
|---|---|---|
| Magic Missile | Wizard | 3 darts, 1d4+1 each, auto-hit. +1 dart per upcast. |
| Shield | Wizard, Fighter | +5 AC until next turn. Reaction. |
| Cure Wounds | Cleric, Ranger | Heal 1d8 + WIS mod. +1d8 per upcast. |
| Healing Word | Cleric | Heal 1d4 + WIS mod at range. Bonus action. |
| Bless | Cleric | 3 allies +1d4 to attacks and saves, 5 turns. Concentration. |
| Shield of Faith | Cleric | +2 AC for 5 turns. Concentration. |
| Hunter's Mark | Ranger | +1d6 damage to marked target, 5 turns. Concentration. |
| Ensnaring Strike | Ranger | Next attack: STR save or restrained 2 turns. |
| Thunderous Smite | Fighter | Next melee: +2d6 thunder + push 2 tiles. |
| Sleep | Wizard | 5d8 HP worth of creatures fall asleep. Lowest HP first. |

#### Level 2 Spells

| Spell | Class | Effect |
|---|---|---|
| Fireball | Wizard | 8d6 fire, radius 3. DEX save half. +1d6 per upcast. |
| Misty Step | Wizard | Teleport 6 tiles. Bonus action. |
| Spiritual Weapon | Cleric | Summon spirit weapon, 1d8+WIS, attacks each turn 5 turns. |
| Spike Growth | Ranger | Spike zone radius 3, 2d4 per tile moved. Concentration. |

#### Level 3 Spells

| Spell | Class | Effect |
|---|---|---|
| Lightning Bolt | Wizard | 8d6 lightning in a line. DEX save half. |
| Counterspell | Wizard | Negate enemy spell. Reaction. Auto if same level. |
| Haste | Wizard | +2 AC, double speed, extra action 5 turns. Concentration. |
| Spirit Guardians | Cleric | Enemies in 2 tiles take 3d8 radiant at turn start. Concentration. |
| Wall of Force | Wizard | Impassable wall 5 turns. Blocks movement and projectiles. |

### Reactions (Toggle On/Off, 1 Each Per Round)

Each reaction you know fires **once per round** (not one reaction total — each fires once).

| Reaction | Class | Level | Window | Effect |
|---|---|---|---|---|
| Opportunity Attack | All | 1 | Enemy leaves range | Free melee attack |
| Parry | Fighter | 3 | After hit, before damage | Reduce by DEX mod + superiority die |
| Riposte | Fighter | 5 | After enemy miss | Free attack + superiority die |
| Uncanny Dodge | Ranger | 7 | After hit, before damage | Halve incoming damage |
| Warding Flare | Cleric | 3 | Before ally is hit | Impose disadvantage on attacker |

**5 Reaction Timing Windows:**

| Window | When | Example Reactions |
|---|---|---|
| `before_hit` | Attack roll made, before hit confirmed | Warding Flare, Shield spell |
| `after_hit_before_damage` | Hit confirmed, before damage applied | Parry, Uncanny Dodge |
| `after_miss` | Attack missed | Riposte |
| `enemy_leaves_range` | Enemy moves away from adjacent | Opportunity Attack |
| `before_spell` | Enemy begins casting | Counterspell |

### Passives (Always On)

| Passive | Class | Level | Effect |
|---|---|---|---|
| Fighting Style: Defense | Fighter | 1 | +1 AC while wearing armor |
| Fighting Style: Archery | Ranger | 1 | +2 to ranged attack rolls |
| Extra Attack | Fighter, Ranger | 5 | Attack twice per Attack action |
| Improved Critical | Fighter | 7 | Crit on 19-20 |
| Colossus Slayer | Ranger | 3 | +1d8 vs wounded targets (1/turn) |
| Evasion | Ranger | 9 | DEX save success = 0 damage, fail = half |
| Disciple of Life | Cleric | 1 | Healing spells +2+spell_level |
| Blessed Healer | Cleric | 6 | Heal others → heal self 2+spell_level |
| Divine Strike | Cleric | 8 | Weapon attacks +1d8 radiant (1/turn) |
| Sculpt Spells | Wizard | 2 | Allies auto-save on your AOE |
| Potent Cantrip | Wizard | 6 | Cantrips deal half on successful save |
| Empowered Evocation | Wizard | 10 | +INT mod to evocation spell damage |

### Weapon Abilities (From Equipped Weapon)

Per-encounter charges. Granted when weapon is equipped.

| Ability | Weapon Types | Effect |
|---|---|---|
| Pommel Strike | Longsword, Shortsword, Greatsword | 1d4 bludgeoning + daze 1 turn |
| Cleave | Longsword, Greatsword, Greataxe | Hit all adjacent enemies |
| Hamstring Shot | Shortbow, Longbow, Crossbow | Weapon damage + half movement 2 turns |
| Topple | Quarterstaff, Mace | STR save or prone. Next attack has advantage. |
| Lacerate | Longsword, Greatsword, Greataxe, Dagger | Weapon damage + bleed 1d4/turn 2 turns |

---

## Scaling

### Auto-Scaling by Level

| Ability Type | How It Scales |
|---|---|
| Cantrips | Damage dice increase at levels 5 and 10 |
| Maneuvers | Superiority die grows: d6 → d8 → d10 |
| Spells | Upcast for more dice (spend higher slot) |
| Passives | Some unlock at specific levels |

### No Ability Upgrades

- No "Cleave II" or "Fireball+". Each ability is unique.
- Power comes from: level scaling, better equipment, spell slot upcasting.
- Design intent: every ability feels distinct, no "same thing but bigger" bloat.

---

## Learning Abilities

| Source | What You Get |
|---|---|
| Level-up | 1 new ability choice from class pool |
| Spell Tomes | Learn a specific spell (found in dungeons) |
| Skill Books | Learn a specific passive or maneuver (rare drops) |
| Quest Rewards | Unique abilities tied to story |

---

## Ability Inheritance System

All abilities use `extends:` to inherit animation, FX, sound, and timing from base templates.

### Base Templates (Engine-Level)

| Template | Animation | FX | Used By |
|---|---|---|---|
| `melee_attack` | swing + lunge | slash trail | Strike, Trip Attack, Pommel Strike |
| `ranged_attack` | pull back + release | arrow projectile | Quick Shot, Hamstring Shot |
| `spell_bolt` | cast forward | magic projectile | Fire Bolt, Ray of Frost, Sacred Flame |
| `spell_aoe` | cast up | circle expands | Fireball, Lightning Bolt, Spirit Guardians |
| `spell_buff` | cast touch | target glows | Bless, Shield of Faith, Haste |
| `spell_heal` | cast touch | green particles | Cure Wounds, Healing Word |
| `self_buff` | focus + glow | aura radiates | Second Wind, Action Surge |
| `reaction_block` | raise shield | shield flash | Parry, Shield spell |
| `reaction_counter` | dodge + strike | fast slash | Riposte |
| `summon` | hands to ground | magic circle | Spiritual Weapon |
| `push_target` | shove | knockback trail | Shove, Pushing Attack |

### Ability Definition Format (Mod-Compatible)

All core abilities use the same format modders use:

```yaml
# Ability extends a base template
fire_bolt:
  name: "Fire Bolt"
  extends: spell_bolt           # inherit animation, FX, sound
  class: [wizard]
  type: cantrip
  override:
    fx: projectile_fire         # swap blue bolt for fireball
    hit_sound: explosion        # swap for explosion sound
  scaling:
    level_1: { damage: "1d10" }
    level_5: { damage: "2d10" }
    level_10: { damage: "3d10" }

# Maneuver with rule script
trip_attack:
  name: "Trip Attack"
  extends: melee_attack
  class: [fighter]
  type: maneuver
  cost: { type: per_encounter, charges: 2 }
  override:
    target_animation: fall_prone
  rules:
    - when: "on_hit"
      do: |
        ability.bonus_damage(superiority_die)
        save = saving_throw(target, 'STR', maneuver_dc)
        if not save then
          apply_status(target, 'prone', 1)
        end
```

### Chain Inheritance

Modders extend existing abilities:

```yaml
# Modder's "Ice Bolt" extends core Fire Bolt
ice_bolt:
  name: "Ice Bolt"
  extends: fire_bolt              # inherits fire_bolt's everything
  override:
    fx: projectile_frost          # swap fire for frost
    hit_sound: ice_shatter
  rules:
    - when: "on_hit"
      do: "apply_status(target, 'slowed', 1)"
```

Inheritance chain: `spell_bolt → fire_bolt → ice_bolt`

---

## Items Reference Abilities

Items don't redefine abilities — they reference them:

```yaml
# Scroll points to an ability
scroll_fire_bolt:
  type: scroll
  casts: fire_bolt              # uses fire_bolt's everything
  cast_level: 1
  consumed_on_use: true

# Potion points to an effect ability
healing_potion:
  type: potion
  casts: potion_heal_effect     # references a potion ability
  consumed_on_use: true

# Weapon grants abilities when equipped
longsword:
  type: weapon
  weapon_abilities: [pommel_strike, cleave]

# Throwable has separate throw ability
alchemist_fire:
  type: potion
  throwable: true
  casts: alchemist_fire_drink   # drink effect
  throw_casts: alchemist_fire_throw  # different ability when thrown
```

---

## Open Questions (Resolved)

- ~~Cooldown-based or per-rest?~~ → **Per-encounter + per-rest** (BG3 model)
- ~~How many spell slots?~~ → See spell slot table above
- ~~Reactions: 1 total or 1 each?~~ → **1 each per round** (no wasted skills)
- ~~Ability upgrades?~~ → **No upgrades** — abilities scale via level, not tiers
- ~~How do items grant abilities?~~ → `casts:` for scrolls/potions, `weapon_abilities:` for weapons
