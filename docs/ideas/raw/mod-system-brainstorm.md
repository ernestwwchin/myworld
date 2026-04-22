# Mod System Brainstorm

Status: raw
Date: 2026-04-21
Source: design discussion

---

## Core Decisions

- **4-tier mod system**: Data → Tuning → Hook DSL → JS Scripts
- **Ability inheritance**: `extends:` + `override:` for base templates → abilities
- **Items reference abilities**: scrolls `casts:`, potions `casts:`, weapons `weapon_abilities:[]`
- **~25 engine primitives** (hardcoded TS): everything else is YAML composition
- **Passive rules DSL**: `when:` / `do: |` multiline script, ~45 trigger points
- **Trigger-time evaluation**: rules evaluate at cast time, not pre-baked onto abilities
- **Core game uses mod format**: all core abilities use the same YAML format modders use

---

## 4-Tier Mod Architecture

| Tier | What | Skill Needed | Power |
|---|---|---|---|
| **1: Data** | New creatures, weapons, items, stages | Beginner | Add content |
| **2: Tuning** | Override values, balance changes | Beginner | Modify numbers |
| **3: Hook DSL** | `when:` / `do:` script rules | Intermediate | Custom mechanics |
| **4: JS Scripts** | `fn:` raw JavaScript blocks | Advanced | Anything |

### Tier 1-2: Pure YAML Data

```yaml
# Add new creature — just data
creatures:
  frost_spider:
    name: "Frost Spider"
    hp: 25
    ac: 12
    damage: "1d6+2"
    damage_type: cold

# Creature inheritance — extends parent, overrides specific fields
# Objects deep-merge (stats, ai, attack); scalars and arrays replace.
creatures:
  goblin_archer:
    extends: goblin               # inherits all goblin fields
    name: "Goblin Archer"
    attack: { weaponId: shortbow, dice: "1d6", range: 6 }

  goblin_warrior:
    extends: goblin
    name: "Goblin Warrior"
    hp: 12
    ac: 14
    attack: { weaponId: longsword, dice: "1d8+1", range: 1 }

# Circular extends detected and warned at load time.
# Missing parent warned but child still loads as-is.

# Override existing value — later mod wins
weapons:
  longsword:
    damageDice: "1d10+3"    # overrides core's 1d8+3
```

### Tier 3: Hook DSL (when/do)

```yaml
# Most modders write this. Reads like English. No JS needed.
rules:
  - when: "ability.tag.fire"
    do: "ability.damage_type = 'cold'"
```

### Tier 4: Raw JS (rare)

```yaml
# For truly complex logic the DSL can't handle
rules:
  - when: "always"
    fn: |
      const enemies = mod.getEnemies();
      // ... complex JavaScript logic
```

---

## Ability Inheritance System

### Layer 1: Base Templates (Engine-Level)

Define default animation, FX, sound, and timing. Rarely touched by modders.

```yaml
base_templates:
  melee_attack:
    animation: swing
    fx: slash_basic
    sound: sword_hit
    miss_sound: sword_whoosh
    camera: shake_light
    timing:
      windup: 200
      impact: 100
      recover: 150

  spell_bolt:
    animation: cast_forward
    fx: projectile_magic
    sound: magic_cast
    hit_sound: magic_impact
    camera: follow_projectile
    timing:
      windup: 300
      travel: 250
      impact: 150

  spell_aoe:
    animation: cast_up
    fx: aoe_circle
    sound: magic_cast_big
    hit_sound: explosion
    camera: shake_medium
    timing:
      windup: 400
      expand: 300
      impact: 200

  spell_buff:
    animation: cast_touch
    fx: glow_up
    sound: magic_buff

  spell_heal:
    animation: cast_touch
    fx: heal_glow
    sound: heal_chime

  self_buff:
    animation: focus
    fx: aura_self
    sound: power_up

  summon:
    animation: cast_ground
    fx: summon_circle
    sound: summon_appear

  reaction_block:
    animation: block
    fx: shield_flash
    sound: shield_block

  reaction_counter:
    animation: counter_swing
    fx: slash_quick
    sound: counter_hit

  push_target:
    animation: shove
    fx: knockback_trail
    sound: impact_heavy
```

### Layer 2: FX Library

Pre-defined visual effects modders reference by name.

```yaml
fx_library:
  # Projectiles
  projectile_arrow:    { type: projectile, sprite: arrow, speed: 600 }
  projectile_fire:     { type: projectile, sprite: fireball_small, speed: 400, trail: flame }
  projectile_frost:    { type: projectile, sprite: ice_shard, speed: 500, trail: frost }
  projectile_lightning: { type: projectile, sprite: lightning_bolt, speed: 800, trail: electric }
  projectile_holy:     { type: projectile, sprite: holy_bolt, speed: 450, trail: sparkle }

  # Impacts
  slash_basic:         { type: impact, sprite: slash_white, duration: 200, shake: light }
  explosion:           { type: impact, sprite: explosion_fire, duration: 400, shake: heavy }
  explosion_frost:     { type: impact, sprite: explosion_ice, duration: 400, shake: medium }
  holy_burst:          { type: impact, sprite: radiant_burst, duration: 300 }

  # Auras / Buffs
  glow_up:             { type: buff, color: "#ffffff", duration: 400 }
  heal_glow:           { type: buff, color: "#44ff44", duration: 400 }
  aura_self:           { type: aura, color: "#ffcc00", radius: 1, pulse: true }
  shield_flash:        { type: buff, color: "#aaaaff", duration: 200 }

  # Status indicators
  status_poison:       { type: status_vfx, color: "#44aa44", particles: bubble_green }
  status_bleed:        { type: status_vfx, color: "#cc0000", particles: drip_red }
  status_burn:         { type: status_vfx, color: "#ff6600", particles: flame_small }
  status_frozen:       { type: status_vfx, sprite: ice_encase, color: "#aaddff" }
```

### Layer 3: Animation Library

```yaml
animations:
  swing:           { frames: 4, speed: 100, type: attack }
  thrust:          { frames: 3, speed: 80,  type: attack }
  shoot:           { frames: 4, speed: 120, type: attack }
  throw:           { frames: 3, speed: 100, type: attack }
  cast_forward:    { frames: 4, speed: 100, type: cast }
  cast_up:         { frames: 5, speed: 120, type: cast }
  cast_ground:     { frames: 4, speed: 100, type: cast }
  cast_touch:      { frames: 3, speed: 100, type: cast }
  block:           { frames: 2, speed: 60,  type: reaction }
  dodge:           { frames: 3, speed: 80,  type: reaction }
  focus:           { frames: 3, speed: 120, type: buff }
  death:           { frames: 4, speed: 150, type: death }
```

### Layer 4: Abilities (extends templates)

```yaml
# Simple: just inherits everything
strike:
  extends: melee_attack
  class: [fighter]
  type: cantrip
  damage: "weapon"

# Override FX
fire_bolt:
  extends: spell_bolt
  class: [wizard]
  type: cantrip
  override:
    fx: projectile_fire
    hit_sound: explosion
  scaling:
    level_1: { damage: "1d10" }
    level_5: { damage: "2d10" }
    level_10: { damage: "3d10" }

# Override animation + FX
fireball:
  extends: spell_aoe
  class: [wizard]
  type: spell
  level: 2
  override:
    hit_fx: explosion
    camera: shake_heavy
  rules:
    - when: "on_spell_cast"
      do: |
        dice = 7 + spell.slot_level
        enemies = get_enemies_in_radius(target.tile, 3)
        for enemy in enemies do
          dmg = roll_dice('{dice}d6')
          save = saving_throw(enemy, 'DEX', spell_dc)
          if save then dmg = floor(dmg / 2) end
          damage(enemy, dmg, 'fire')
        end

# Chain inheritance: modder extends fireball
greater_fireball:
  extends: fireball
  type: spell
  level: 3
  override:
    camera: shake_extreme
    hit_fx_scale: 1.5
  rules:
    - when: "on_spell_cast"
      do: |
        dice = 10 + spell.slot_level
        enemies = get_enemies_in_radius(target.tile, 4)
        for enemy in enemies do
          dmg = roll_dice('{dice}d6')
          save = saving_throw(enemy, 'DEX', spell_dc)
          if save then dmg = floor(dmg / 2) end
          damage(enemy, dmg, 'fire')
        end
        spawn_terrain('fire', target.tile, 4, 3)
```

### Inheritance Resolution

```
fire_bolt extends spell_bolt:

  spell_bolt (base):
    animation: cast_forward ───── KEEP (not overridden)
    fx: projectile_magic ──────── OVERRIDE → projectile_fire
    sound: magic_cast ─────────── KEEP
    hit_sound: magic_impact ───── OVERRIDE → explosion
    camera: follow_projectile ─── KEEP
    timing: { 300, 250, 150 } ── KEEP

  fire_bolt (final):
    animation: cast_forward       ← from spell_bolt
    fx: projectile_fire           ← overridden
    sound: magic_cast             ← from spell_bolt
    hit_sound: explosion          ← overridden
    + damage, scaling, tags       ← fire_bolt's own
```

---

## Items Reference Abilities

```
┌─────────────────────────────────────────┐
│              ITEM (YAML)                │
│                                         │
│  Scroll ──casts:──→ Ability (spell)     │
│  Potion ──casts:──→ Ability (effect)    │
│  Weapon ──weapon_abilities:──→ [Ability] │
│  Grenade ──throw_casts:──→ Ability      │
└─────────────────────────────────────────┘
```

```yaml
# Scroll: just reference the spell
scroll_fire_bolt:
  type: scroll
  casts: fire_bolt
  cast_level: 1
  consumed_on_use: true

# Potion: reference an effect ability
healing_potion:
  type: potion
  casts: potion_heal_effect
  consumed_on_use: true

# Weapon: grants abilities when equipped
longsword:
  type: weapon
  weapon_abilities: [pommel_strike, cleave]

# Throwable: different ability when thrown vs used
alchemist_fire:
  type: potion
  throwable: true
  casts: alchemist_fire_drink
  throw_casts: alchemist_fire_throw
```

---

## Engine Primitives (~25 Hardcoded Behaviors)

These require TypeScript code because they touch rendering, AI, sight, movement, or turn flow.
Everything else is YAML composition.

### Visual (3)

| Primitive | Code Touches | What It Does |
|---|---|---|
| `invisible` | sprite-system, sight-system, fog-system, combat-ai | Sprite alpha, remove from enemy sight |
| `phasing` | movement-system, collision | Walk through walls/enemies |
| `size_change` | sprite-system, damage-system | Enlarge/Reduce sprite scale |

### Sight (3)

| Primitive | Code Touches | What It Does |
|---|---|---|
| `blinded` | sight-system, fog-system, combat-ai | Sight radius = 0 |
| `darkvision` | sight-system, fog-system, light-system | Extended sight in dark |
| `truesight` | sight-system, entity-system | See invisible, hidden traps/doors |

### Movement (5)

| Primitive | Code Touches | What It Does |
|---|---|---|
| `immobilized` | movement-system, input-system | Speed = 0, can still act |
| `speed_modifier` | movement-system | +/- or multiply movement tiles |
| `forced_movement` | movement-system, damage-system, collision | Push/pull/knockback |
| `teleport` | movement-system, fog-system, camera-system | Instant reposition |
| `prone` | movement-system, damage-system, sprite-system | Costs movement to stand |

### Turn Flow (3)

| Primitive | Code Touches | What It Does |
|---|---|---|
| `stunned` | mode-combat, input-system, combat-ai | Skip turn, can't act/move/react |
| `incapacitated` | mode-combat, input-system | Can't act but can move |
| `extra_action` / `lose_action` | mode-combat, action-buttons | Action economy change |

### Damage (6)

| Primitive | Code Touches | What It Does |
|---|---|---|
| `advantage` / `disadvantage` | damage-system | Roll 2d20, take higher/lower |
| `resistance` / `vulnerability` / `immunity` | damage-system | Damage multiplier by type |
| `damage_over_time` | status-effect-system, damage-system | Tick damage each turn |
| `temp_hp` | damage-system, ui/side-panel | Absorb-first HP pool |
| `damage_shield` | damage-system | Absorb X then break |
| `reflect_damage` | damage-system | Damage back on hit |

### AI (3)

| Primitive | Code Touches | What It Does |
|---|---|---|
| `frightened` | combat-ai, movement-system | Must flee from source |
| `charmed` | combat-ai | Can't attack source |
| `taunted` / `controlled` | combat-ai, mode-combat | Must attack source / switch teams |

### Entity (3)

| Primitive | Code Touches | What It Does |
|---|---|---|
| `summon` | entity-system, mode-combat, sprite-system | Create entity on map |
| `terrain_effect` | entity-system, movement-system, damage-system | Create/modify tile effects |
| `concentration` | status-effect-system, damage-system | Lose spell on damage + failed save |

---

## Status Composition (from Primitives)

Mod-defined statuses compose from engine primitives:

```yaml
statuses:
  # Simple: one primitive
  poisoned:
    effects:
      - advantage: { attacks: disadvantage, ability_checks: disadvantage }

  # Compound: multiple primitives
  haste:
    effects:
      - speed_modifier: { multiply: 2 }
      - extra_action: { type: action }
      - advantage: { saves_dex: advantage }
    on_expire:
      apply: lethargy

  restrained:
    effects:
      - immobilized: true
      - advantage: { attacks: disadvantage, saves_dex: disadvantage }

  invisible:
    effects:
      - invisible: true
      - advantage: { attacks: advantage }
    breaks_on: [attack, cast_spell]

  paralyzed:
    effects:
      - stunned: true
      - advantage: { saves_str: auto_fail, saves_dex: auto_fail }

  # Modder custom: compose from same primitives
  shadow_curse:
    effects:
      - damage_over_time: { dice: "1d6", type: necrotic }
      - speed_modifier: { add: -1 }
      - advantage: { saves_wis: disadvantage }
    save_to_end: { stat: CON, dc: 14 }
```

---

## Passive Rules DSL

### Format

```yaml
rules:
  # Single action — inline string
  - when: "ability.tag.fire"
    do: "ability.damage_type = 'cold'"

  # Multiple actions — multiline block
  - when: "ability.tag.fire"
    do: |
      ability.damage_type = 'cold'
      ability.swap_tag('fire', 'cold')
      ability.add_effect('slowed', target, 1)
```

### `when:` — Conditions

```yaml
# Properties
ability.id, ability.type, ability.tag.fire, ability.damage_type, ability.slot_level
caster.class, caster.level, caster.hp_pct, caster.has('status'), caster.stat.str
target.hp_pct, target.has('prone'), target.type, target.ac
reaction.id, reaction.success, reaction.window
attacker, weapon.type, terrain

# Operators
and, or, not
==, !=, >, <, >=, <=
in ['list', 'of', 'values']
```

### `do:` — Actions

```yaml
# Modify ability
ability.damage_type = 'cold'
ability.bonus_damage('2d4')
ability.bonus_range(2)
ability.add_effect('statusId', target, duration)
ability.swap_tag('fire', 'cold')

# Deal/heal
damage(target, '1d6', 'fire')
heal(caster, '1d8')

# Status
apply_status(target, 'frozen', 2)
remove_status(target, 'slowed')

# Resources
refund_slot(level)
grant_charge('second_wind')
grant_action()

# Spawn
spawn_ally('skeleton', target.tile, 5)
spawn_terrain('fire', target.tile, 3)

# Display
log('message')
float(target, '+8', 'green')
banner('Critical Hit!', 'combat')
```

---

## Trigger-Time Evaluation

Rules evaluate at cast time, not pre-baked onto abilities.

```
Player casts Fire Bolt with Staff of Frost equipped:

STEP 1: Load base ability → Fire Bolt: 2d10 fire
STEP 2: Collect active passive rules with trigger: on_ability_resolve
STEP 3: Sort by priority (lower first)
STEP 4: Evaluate each rule's condition at THIS MOMENT
  frost_conversion: ability.tag.fire? YES → APPLY (damage_type → cold)
  glacial_frostbite: ability.tag.cold? YES (just changed!) → APPLY
  burning_ground: ability.tag.fire? NO (cold now!) → SKIP
STEP 5: Final resolved ability: Frost Bolt, 2d10 cold + slowed + frostbitten
STEP 6: Execute. Roll dice. Apply effects.
```

### Why Trigger-Time Is Better

- Swap weapons mid-fight → old weapon rules stop, new weapon rules start
- Status suppressed by Dispel → rules stop evaluating
- Equipment cursed → condition check fails
- No recalculation needed when state changes

---

## Complete Trigger Map (~45 Triggers)

### Combat Lifecycle (6)

| Trigger | When |
|---|---|
| `on_combat_start` | Combat begins |
| `on_combat_end` | Combat resolved |
| `on_round_start` | New round begins |
| `on_round_end` | All combatants acted |
| `on_turn_start` | Actor's turn begins |
| `on_turn_end` | Actor's turn ends |

### Attack Flow (4)

| Trigger | When | Modifiable |
|---|---|---|
| `on_attack_roll` | d20 rolled, before hit/miss | roll bonus, advantage |
| `on_hit` | Attack hits | bonus damage |
| `on_miss` | Attack misses | trigger riposte |
| `on_crit` | Natural 20 | crit damage |

### Damage Flow (5)

| Trigger | When | Modifiable |
|---|---|---|
| `on_damage_roll` | Dice rolled, before applied | damage amount, type |
| `on_damage_dealt` | After damage applied | read-only |
| `on_damage_taken` | Actor receives damage | read-only |
| `on_kill` | Attacker kills target | on-kill effects |
| `on_death` | Actor dies | death ward |

### Spell Flow (6)

| Trigger | When |
|---|---|
| `on_spell_cast` | Spell declared |
| `on_saving_throw` | Target rolls save |
| `on_save_success` | Target passes save |
| `on_save_fail` | Target fails save |
| `on_spell_hit` | Spell affects target |
| `on_concentration_check` / `on_concentration_break` | Hit while concentrating |

### Status Flow (4)

| Trigger | When |
|---|---|
| `on_status_applied` | Status added |
| `on_status_tick` | Status ticks (turn start/end) |
| `on_status_removed` | Status expires/dispelled |
| `on_status_resisted` | Actor resists status |

### Healing Flow (2)

| Trigger | When |
|---|---|
| `on_heal_roll` | Healing calculated |
| `on_heal_received` | Actor receives healing |

### Movement Flow (4)

| Trigger | When |
|---|---|
| `on_move_start` | Actor begins moving |
| `on_tile_enter` | Actor enters tile |
| `on_tile_leave` | Actor leaves tile |
| `on_move_end` | Actor finishes movement |

### Resource Flow (4)

| Trigger | When |
|---|---|
| `on_rest` | Actor rests |
| `on_slot_spent` | Spell slot consumed |
| `on_charge_spent` | Ability charge consumed |
| `on_consumable_used` | Scroll/potion/bomb used |

### Reaction Flow (2)

| Trigger | When |
|---|---|
| `on_reaction_trigger` | Reaction condition met |
| `on_reaction_used` | Reaction activated |

### Explore Flow (8)

| Trigger | When |
|---|---|
| `on_explore_move` | Player moves in explore mode |
| `on_door_open` | Door opened |
| `on_chest_open` | Chest opened |
| `on_trap_trigger` | Trap triggered |
| `on_trap_disarm` | Trap disarmed |
| `on_item_pickup` | Item picked up |
| `on_enemy_spotted` | Enemy enters sight |
| `on_floor_enter` / `on_floor_exit` | Enter/leave floor |

---

## Passive Rule Sources

| Source | Lifetime | Example |
|---|---|---|
| **Equipment** | While equipped | Staff of Frost: fire → cold |
| **Enchantment** | While gear equipped | Glacial: cold hits → frostbitten |
| **Town upgrade** | Permanent | Training Grounds: Trip prone +1 turn |
| **Class passive** | Permanent (learned) | Sculpt Spells: allies auto-save on AOE |
| **Status effect** | Temporary (X turns) | Empowered: spells +2d4 |
| **World cantrip** | Permanent (learned) | Mending: repair abilities work on higher ★ |
| **Companion aura** | While companion alive | Arcane Ward: +1 save vs magic |
| **Terrain** | While standing on tile | Consecrated ground: heals +2 |

---

## Mod API Methods

```js
// Ability Queries
mod.getAbilityCharges(abilityId)     // → { current, max }
mod.getSpellSlots(level)             // → { current, max }
mod.hasStatus(target, statusId)      // → boolean
mod.getActiveModifiers(abilityId)    // → array of active mods

// Ability Modifications
mod.addBonusDamage(amount, type)
mod.overrideDamageType(newType)
mod.addEffect(target, effect)
mod.extendDuration(statusId, turns)
mod.refundSpellSlot(level)
mod.grantExtraCharge(abilityId)

// Spawning
mod.spawnAlly(creatureId, x, y, opts)
mod.spawnTerrain(type, x, y, duration)

// Entity Queries
mod.getEnemies()
mod.getAllies()
mod.getEnemiesInRadius(center, radius)
mod.getAdjacentEnemies(actor)
```

---

## BG3-Style Item Examples in Our DSL

```yaml
# "Sword of Life Stealing" — on crit, heal
sword_of_life_stealing:
  rules:
    - when: "on_crit"
      do: |
        heal(caster, 10)
        log('Life Stealing: healed for 10!')

# "Boots of Speed" — on combat start, gain haste
boots_of_speed:
  rules:
    - when: "on_combat_start"
      do: "apply_status(wearer, 'haste', 2)"

# "Adamantine Armour" — reduce damage by 2, crit immunity
adamantine_armour:
  rules:
    - when: "on_damage_taken"
      do: "damage.amount = max(0, damage.amount - 2)"
    - when: "on_crit and target == wearer"
      do: "crit.cancel()"

# "Lightning Charges" — stack charges, discharge at 5
lightning_charges_amulet:
  rules:
    - when: "on_hit and attack.type == 'weapon'"
      do: |
        counter.lightning_charges += 1
        float(caster, '⚡', 'blue')
    - when: "on_hit and counter.lightning_charges >= 5"
      do: |
        ability.bonus_damage('1d8', 'lightning')
        counter.lightning_charges = 0
        log('Lightning Charges discharged!')

# "Great Weapon Master" — on kill/crit, bonus attack
great_weapon_master:
  rules:
    - when: "on_kill or on_crit"
      do: "grant_bonus_attack()"
```

---

## Full Mod Example: "Frost Mage Expansion"

```
public/data/03_frost_mage/
  meta.yaml
  weapons.yaml        # Staff of Frost, Frostbrand
  statuses.yaml       # frozen, frostbitten
  abilities.yaml      # Blizzard, Ice Wall (new spells)
  fx-library.yaml     # custom frost FX
```

```yaml
# meta.yaml
id: 03_frost_mage
name: "Frost Mage Expansion"
includes:
  - weapons.yaml
  - statuses.yaml
  - abilities.yaml
  - fx-library.yaml

# abilities.yaml
abilities:
  blizzard:
    extends: spell_aoe
    class: [wizard]
    type: spell
    level: 3
    override:
      fx: aoe_circle_frost
      hit_fx: explosion_frost
    rules:
      - when: "on_spell_cast"
        do: |
          enemies = get_enemies_in_radius(target.tile, 4)
          for enemy in enemies do
            dmg = roll_dice('8d6')
            save = saving_throw(enemy, 'DEX', spell_dc)
            if save then dmg = floor(dmg / 2) end
            damage(enemy, dmg, 'cold')
            apply_status(enemy, 'frozen', 2)
          end
          spawn_terrain('frozen_ground', target.tile, 4, 3)

# statuses.yaml
statuses:
  frozen:
    effects:
      - stunned: true
    rules:
      - when: "on_damage_taken and damage.type == 'fire'"
        do: |
          remove_status(self, 'frozen')
          log('Fire shatters the ice!')

# weapons.yaml — Staff of Frost with passive rules
weapons:
  staff_of_frost:
    damage: "1d6"
    damage_type: cold
    rules:
      - when: "ability.tag.fire"
        do: |
          ability.damage_type = 'cold'
          ability.swap_tag('fire', 'cold')
          ability.add_effect('slowed', target, 1)
```

---

## Mod API Reference (Engine Audit)

### Implementation Status

| Subsystem | Implemented | Key Gap |
|---|---|---|
| Creatures | 80% | `onHit`, `abilities`, `features`, `ai.profile` not wired |
| Status Effects | 95% | `immunities`, `resistances` not wired |
| Abilities | 70% | Hook system works; most effect types are stubs |
| Loot Tables | 95% | `dropChance` not implemented |
| Combat AI | 50% | Hardcoded pathfind→chase→attack. No profiles. |
| Events | 90% | Good action coverage |
| Stage Config | 100% | Fully working |
| Items | 95% | `onUse` effects mostly work |
| Rules | 100% | All tunable |
| Damage System | 40% | No damage types, resistance, or formula engine |

### Context Variables (for formulas and scripts)

When writing formulas, conditions, or scripts, these variables are available:

```
── Source (the actor performing the action) ──────────────────
source.hp             14          # current hit points
source.maxHp          22          # maximum hit points
source.level          3           # character level
source.ac             16          # armor class
source.str            15          # STR score
source.strMod         2           # STR modifier = floor((str - 10) / 2)
source.dex            10          # DEX score
source.dexMod         0           # DEX modifier
source.con            14          # CON score
source.conMod         2           # CON modifier
source.int            8           # INT score
source.intMod         -1          # INT modifier
source.wis            10          # WIS score
source.wisMod         0           # WIS modifier
source.cha            10          # CHA score
source.chaMod         0           # CHA modifier
source.proficiency    2           # proficiency bonus (2 at L1-4, 3 at L5-8, 4 at L9-10)
source.weaponDice     "1d8+3"    # equipped weapon damage formula
source.atkRange       1           # attack range in tiles
source.speed          5           # movement tiles per turn
source.class          "fighter"   # class id
source.alive          true        # is alive

── Target (the actor receiving the action) ───────────────────
target.hp             7           # current hit points
target.maxHp          7           # maximum hit points
target.ac             12          # armor class
target.str            8           # (same stat fields as source)
target.strMod         -1
target.alive          true
target.type           "goblin"    # creature type id
target.cr             "1/4"       # challenge rating

── Combat Context ────────────────────────────────────────────
combat.round          3           # current round number
combat.turn           "source"    # whose turn (source/target/ally)
distance              2.5         # Euclidean tile distance source↔target
allies_adjacent       1           # allies adjacent to target (for flanking)

── Dice / Roll Context (available in on_hit, on_miss) ───────
roll.d20              17          # natural d20 result
roll.total            19          # d20 + modifiers
roll.isCrit           false       # natural 20
roll.isMiss           false       # total < target.ac
roll.damage           8           # damage dealt (after roll, before reduction)
```

### creatures.yaml — Full Field Reference

```yaml
creatures:
  goblin_shaman:
    # ── Identity ──
    name: "Goblin Shaman"                    # display name
    type: goblin                             # sprite/family type
    icon: "🧙"                               # UI icon
    cr: "1/2"                                # challenge rating (display)
    extends: goblin                          # ⏳ PLANNED — inherit from parent creature

    # ── Core Stats ── (all ✅ REAL)
    hp: 12                                   # hit points
    ac: 12                                   # armor class
    speed: 2                                 # movement tiles per turn
    sight: 5                                 # vision range in tiles
    fov: 120                                 # field of view degrees
    xp: 50                                   # XP reward on kill
    level: 1                                 # level (affects proficiency)

    # ── Ability Scores ── (all ✅ REAL)
    stats: { str: 6, dex: 14, con: 10, int: 14, wis: 12, cha: 12 }

    # ── Skills ── (✅ REAL — used for passive Perception)
    skillProficiencies: [arcana, perception]

    # ── Attack ── (✅ REAL)
    attack:
      weaponId: shortsword                   # references weapons.yaml for damage
      dice: "1d6"                            # OR direct dice if no weaponId
      range: 1                               # tiles (1 = melee, 6 = shortbow)

    # ── Economy ── (✅ REAL)
    gold: "3d6"                              # dice string, rolled on kill
    lootTable: goblin_shaman_drop            # references loot-tables.yaml

    # ── AI ── (⚠️ PARTIAL — stored but profiles not implemented)
    ai:
      profile: support                       # ⏳ PLANNED — basic/ranged/brute/support/boss
      preferredRange: 4                      # ⏳ PLANNED — ideal distance for ranged
      fleeRange: 2                           # ⏳ PLANNED — flee if enemy closer than this
      searchTurns: 4                         # ✅ REAL — how long to search after losing sight
      ambush: true                           # ⏳ PLANNED — start hidden, attack with advantage

    # ── On-Hit Effects ── (⏳ PLANNED — not wired in engine)
    onHit:
      save: { ability: con, dc: 12 }        # target rolls CON save vs DC 12
      fail:
        status: poisoned                     # apply this status on failed save
        duration: 3                          # turns

    # ── Creature Abilities ── (⏳ PLANNED — not wired in engine)
    abilities:
      - id: heal_ally                        # ability id
        trigger: "ally_below_50pct"          # when to use
        cooldown: 3                          # turns between uses
        heal: "2d6"                          # healing amount
        range: 5                             # cast range in tiles
      - id: fire_bolt
        trigger: "default"                   # fallback action
        cooldown: 2
        dice: "1d8"                          # damage
        range: 5                             # tiles
        damageType: fire                     # ⏳ PLANNED — damage type

    # ── Features ── (⏳ PLANNED — not wired for creatures)
    features: [second_wind, leadership]

    # ── Status Immunities ── (⏳ PLANNED)
    immunities: [stun, fear, charm]

    # ── Status Effects Applied at Spawn ── (✅ REAL)
    effects:
      - { id: enraged, duration: 999 }

    # ── Boss Phases ── (⏳ PLANNED)
    phases:
      - name: "Phase 1"
        hpThreshold: 60                      # transitions when HP% drops below
        ac: 18                               # override stats for this phase
        attack: { dice: "2d10+5", range: 1 }
        multiAttack: 2                       # attacks per turn
```

### weapons.yaml — Full Field Reference

```yaml
weapons:
  longsword:
    name: Longsword                          # ✅ display name
    category: martial_melee                  # ✅ weapon category
    damageType: slashing                     # ✅ REAL (logged) but no mechanical effect yet
    damageDice: "1d8+3"                      # ✅ damage formula
    range: 1                                 # ✅ tiles (1 = melee)
    properties: [versatile]                  # ✅ stored, used for display

  shortbow:
    name: Shortbow
    category: simple_ranged
    damageType: piercing
    damageDice: "1d6"
    range: 6                                 # 6 tiles (~12m)
    properties: [ammunition, two_handed]
```

### statuses.yaml — Full Field Reference

```yaml
statuses:
  poisoned:
    name: "Poisoned"                         # ✅ display name
    icon: "🤢"                               # ✅ UI icon
    trigger: turn_start                      # ✅ when effect fires: turn_start | turn_end | time_tick
    duration: 3                              # ✅ turns remaining
    onTrigger:
      damageDice: "1d4"                      # ✅ damage rolled each trigger
      damageColor: 0x44ff44                  # ✅ float text color (green for poison)
      skipTurn: false                        # ✅ if true, actor loses their turn
      removeOnSave:                          # ✅ save to end early
        stat: con                            # ability to roll
        dc: 12                               # difficulty class
```

### items.yaml — Full Field Reference

```yaml
items:
  potion_heal:
    name: "Healing Potion"                   # ✅ display name
    icon: "🧪"                               # ✅ UI icon
    type: consumable                         # ✅ consumable | weapon | armor | gem | misc
    description: "Restores 2d4+2 HP."        # ✅ tooltip text
    onUse:
      consumeOnUse: true                     # ✅ default true; false = reusable
      effects:
        - { type: heal, amount: "2d4+2" }                    # ✅ restore HP
        - { type: removeStatus, statusId: poisoned }         # ✅ cure a status
        - { type: applyStatus, statusId: haste, duration: 5, trigger: turn_end }  # ✅ apply status
        - { type: modifyStat, stat: str, bonus: 4, duration: 10 }   # ✅ temp stat boost
        - { type: log, message: "You feel stronger!" }       # ✅ combat log message
        - { type: useAbility, abilityId: fireball }          # ✅ delegate to ability system
```

### loot-tables.yaml — Full Field Reference

```yaml
starter_common:
  gold: [4, 14]                              # ✅ [min, max] gold range
  rolls: 1                                   # ✅ how many items to pick from pool
  allowDuplicates: true                      # ✅ can same item be picked twice
  dropChance: 0.35                           # ⏳ PLANNED — % chance to drop at all
  pool:
    - id: potion_heal                        # ✅ item id (refs items.yaml)
      name: "Healing Potion"                 # ✅ display name
      weight: 34                             # ✅ relative probability
      icon: "🧪"                             # ✅ UI icon
      type: consumable                       # ✅ item type
      heal: "2d4+2"                          # ✅ shorthand heal (legacy)
      rolls: 1                               # ✅ quantity: number or [min, max]
      value: 10                              # ✅ sell value in gold
```

### rules.yaml — Full Field Reference

```yaml
# All fields ✅ REAL — engine reads and applies these

display:
  tileSize: 32                               # pixel size of each tile

combat:
  roomAlertMaxDistance: 8                     # tiles — enemy group joining range
  largeRoomTileThreshold: 90                 # tiles — detect large combat room
  largeRoomJoinDistance: 6                    # tiles — group merge distance
  fleeMinDistance: 6                          # tiles — distance to successfully flee
  fleeRequiresNoLOS: true                    # must break line of sight to flee
  playerMovePerTurn: 5                       # tiles — movement budget in combat
  dashMoveBonus: 4                           # tiles — extra move from Dash
  enemySightScale: 1.0                       # multiplier on enemy sight range
  enemySpeedScale: 0.75                      # multiplier on enemy speed

fog:
  enabled: true                              # toggle fog of war
  radius: 7                                  # tiles — player vision radius
  unvisitedAlpha: 1.0                        # opacity of never-seen tiles (0-1)
  exploredAlpha: 0.62                        # opacity of visited-but-not-visible tiles
  exploredColor: 2439729                     # hex color of explored fog overlay

light:
  darkSightPenalty: 3                        # sight range reduction in dark
  dimSightPenalty: 1                         # sight range reduction in dim
  hiddenSightPenalty: 2                      # extra penalty when hidden
  torchBrightStrength: 0.85                  # bright light intensity (0-1)
  torchDimStrength: 0.55                     # dim light intensity (0-1)
  torchRadiusScale: 1.2                      # multiplier on torch radius

status:
  exploreTickMs: 1000                        # ms between status ticks in explore mode
  defaultPoisonDamageDice: [1, 4, 0]         # [count, sides, bonus] → "1d4+0"
  sleepWakeDc: 12                            # DC to wake from sleep on damage
```

### stage.yaml — Full Field Reference

```yaml
name: "B1F — The Warren Depths"              # ✅ display name
floor: B1F                                   # ✅ floor identifier
globalLight: dark                            # ✅ bright | dim | dark
nextStage: auto                              # ✅ stage_id | auto | boss | town | null

# ── Fixed Grid ── (use this OR generator, not both)
grid:                                        # ✅ 2D tile map
  - "##########"                             # # = wall, . = floor, D = door
  - "#........#"                             # S = stairs, C = chest
  - "##########"
playerStart: { x: 2, y: 1 }                 # ✅ starting tile

# ── Procedural Generator ── (use this OR grid, not both)
generator:
  type: random                               # ✅ random (cellular automata) | bsp
  cols: 56                                   # ✅ map width in tiles
  rows: 36                                   # ✅ map height in tiles
  depth: 1                                   # ✅ difficulty tier
  fillPct: 48                                # ✅ % of cells initially filled (CA only)
  steps: 5                                   # ✅ CA smoothing iterations
  stairs: true                               # ✅ generate exit stairs

# ── Encounters ── (✅ all fields REAL)
encounters:
  - creature: goblin                         # creature id from creatures.yaml
    count: 5                                 # for generated maps (random placement)
    x: 10                                    # for fixed grid maps (exact tile)
    y: 5
    facing: 180                              # degrees (0=up, 180=down)
    group: "patrol_a"                        # group id (alert together)
    lootTable: goblin_common                 # override creature's default loot table
    gold: 15                                 # override creature's gold
    ai: { searchTurns: 6 }                   # override AI params

# ── Lights ── (✅ REAL)
lights:
  - { x: 5, y: 3, radius: 4, level: bright }

# ── Doors ── (✅ REAL)
doors:
  - { x: 10, y: 5, locked: true, autoOpen: false }

# ── Interactables ── (✅ REAL)
interactables:
  - { x: 15, y: 8, kind: chest, lootTable: starter_common }
  - { x: 20, y: 3, kind: stash }
  - { x: 22, y: 3, kind: shop }

# ── Stage-Local Loot Tables ── (✅ REAL — merged with global)
lootTables:
  floor_special:
    gold: [20, 40]
    rolls: 1
    pool:
      - { id: unique_item, name: "Floor Key", weight: 100 }
```

### events.yaml — Available Actions

```yaml
events:
  - id: ambush_event
    trigger: { playerAt: { x: 10, y: 5 } }  # ✅ position trigger
    conditions:                               # ✅ all condition types
      - { flag: "ambush_done", equals: false }
      - { mode: explore }
      - { hp_above: 5 }
      - { enemyAlive: "guard_1" }
    actions:
      # ── Movement & Combat ──
      - { type: move, x: 12, y: 5 }          # ✅ move player to tile
      - { type: attack, target: "guard_1" }   # ✅ attack enemy
      - { type: enterCombat }                 # ✅ switch to combat mode
      - { type: flee }                        # ✅ attempt flee
      - { type: hide }                        # ✅ enter stealth

      # ── Entity Interaction ──
      - { type: openDoor, x: 10, y: 5 }      # ✅ open door at tile
      - { type: lockDoor, x: 10, y: 5 }      # ✅ lock door
      - { type: interact, x: 15, y: 8 }      # ✅ interact with entity

      # ── Spawning ──
      - { type: spawn, creature: goblin, x: 8, y: 3 }  # ✅ spawn enemy

      # ── Flags ──
      - { type: setFlag, flag: "ambush_done", value: true }     # ✅
      - { type: incrementFlag, flag: "kill_count" }              # ✅
      - { type: toggleFlag, flag: "lever_pulled" }               # ✅

      # ── Dialog & Narrative ──
      - { type: dialog, dialogId: "guard_speech" }  # ✅ start dialog tree
      - { type: say, text: "Halt!" }                # ✅ show NPC text

      # ── Timing ──
      - { type: wait, ms: 500 }              # ✅ delay
      - { type: waitMode, mode: explore }     # ✅ wait until mode changes

      # ── Advanced ──
      - { type: triggerEvent, eventId: "alarm" }  # ✅ chain to another event
      - { type: custom, fn: "myGlobalFn" }        # ✅ call window[fn]()
```

### Engine Gaps (Must Build Before Modders Can Use)

| Priority | Feature | Brainstorm Location | Engine Work Needed |
|---|---|---|---|
| **P0** | Creature `onHit` effects | enemy-scaling-brainstorm.md | Wire save→status in damage-system.ts |
| **P0** | AI profiles (ranged, support, brute) | enemy-scaling-brainstorm.md | Refactor combat-ai.ts with profile dispatch |
| **P0** | Creature `abilities` (spells/heals) | ability-system-brainstorm.md | Add creature ability resolution in combat turn |
| **P0** | Creature `extends:` inheritance | mod-system-brainstorm.md | Add `_resolveCreature()` to modloader.ts |
| **P1** | Damage types + resistance | game-parameters.md | Add damage type field to damage pipeline |
| **P1** | `dropChance` on loot tables | game-parameters.md | Add roll check before loot resolution |
| **P1** | Boss phases | boss-fight-brainstorm.md | Add phase transition engine |
| **P1** | Legendary actions | boss-fight-brainstorm.md | Add between-turn action slots |
| **P2** | Formula engine (`source.strMod + 2`) | mod-system-brainstorm.md | Expression parser for YAML values |
| **P2** | Status immunities | enemy-scaling-brainstorm.md | Check immunities before applying |
| **P2** | Ability effect types (spawn, counter) | ability-system-brainstorm.md | Implement remaining stub effects |
