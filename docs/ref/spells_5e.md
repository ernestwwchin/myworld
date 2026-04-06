# 5e SRD Spells Reference

Compact spell list for a tactical dungeon crawler: cantrips + levels 1–3 for Wizard, Cleric, and Ranger.
Each entry includes the project `abilities.yaml` schema equivalent.
Based on the 5e System Reference Document.

**Status legend**: ✅ Implemented | 🔲 Planned

| Level | Spell | Class | Type | Damage/Effect |
|-------|-------|-------|------|---------------|
| Cantrip | Fire Bolt | Wizard | Attack | 1d10 fire |
| Cantrip | Sacred Flame | Cleric | DEX save | 1d8 radiant |
| Cantrip | Ray of Frost | Wizard | Attack | 1d8 cold + slow |
| Cantrip | Spare the Dying | Cleric | Touch | Stabilize |
| Cantrip | Guidance | Cleric | Touch | +1d4 to check |
| 1st | Magic Missile | Wizard | Auto-hit | 3d4+3 force |
| 1st | Shield | Wizard | Reaction | +5 AC |
| 1st | Sleep | Wizard | AoE | 5d8 HP pool |
| 1st | Cure Wounds | Cleric/Ranger | Touch | Heal 1d8+WIS |
| 1st | Bless | Cleric | 3 allies | +1d4 atk/saves |
| 1st | Hunter's Mark | Ranger | Bonus | +1d6 on hits |
| 1st | Healing Word | Cleric | Bonus/ranged | Heal 1d4+WIS |
| 2nd | Scorching Ray | Wizard | 3x Attack | 2d6 fire each |
| 2nd | Hold Person | Wiz/Clr | WIS save | Paralyze |
| 2nd | Spiritual Weapon | Cleric | Bonus | 1d8+WIS force |
| 2nd | Lesser Restoration | Clr/Rgr | Touch | Remove condition |
| 3rd | Fireball | Wizard | DEX save/AoE | 8d6 fire |
| 3rd | Lightning Bolt | Wizard | DEX save/line | 8d6 lightning |
| 3rd | Counterspell | Wizard | Reaction | Cancel spell |
| 3rd | Revivify | Cleric | Touch | Revive at 1 HP |
| 3rd | Spirit Guardians | Cleric | Aura | 3d8 radiant/turn |

---

## Spellcasting Basics

| Concept | Rule |
|---------|------|
| **Spell Attack** | d20 + spellcasting ability mod + proficiency bonus |
| **Spell Save DC** | 8 + spellcasting ability mod + proficiency bonus |
| **Concentration** | Some spells require concentration. Taking damage → CON save DC max(10, damage/2). Fail = spell ends. Only one concentration spell at a time. |
| **Components** | V (verbal), S (somatic), M (material). Simplified for this engine: all spells assumed castable if not silenced/restrained. |
| **Ritual** | Can cast without using a spell slot if you spend 10 extra minutes. Not relevant in combat. |

### Spellcasting Ability by Class

| Class | Ability | Attack Mod | Save DC |
|-------|---------|------------|---------|
| Wizard | INT | INT mod + prof | 8 + INT mod + prof |
| Cleric | WIS | WIS mod + prof | 8 + WIS mod + prof |
| Ranger | WIS | WIS mod + prof | 8 + WIS mod + prof |

---

## Cantrips (At Will)

### Fire Bolt 🔲 (Wizard)

> Ranged spell attack. Bread-and-butter Wizard damage cantrip.

| Stat | Value |
|------|-------|
| School | Evocation |
| Casting Time | 1 action |
| Range | 120 ft (8 tiles) |
| Components | V, S |
| Duration | Instantaneous |

**Effect**: Ranged spell attack. 1d10 fire damage. Scales: 2d10 at lvl 5, 3d10 at lvl 11.

```yaml
fire_bolt:
  name: "Fire Bolt"
  type: action
  resourceCost: { action: 0 }
  range: 8
  description: "Hurl a bolt of fire at a creature. Ranged spell attack."
  requiresTarget: true
  requiresClass: Wizard
  scaling:
    cantrip: true
    damageDice: ["1d10", "1d10", "1d10", "1d10", "2d10", "2d10", "2d10", "2d10", "2d10", "2d10", "3d10", "3d10"]
  template:
    hit:
      attackRoll:
        ability: int
        addProf: true
    damage:
      base: "1d10"
      type: fire
      addMods: []
```

### Sacred Flame 🔲 (Cleric)

> DEX save cantrip. Radiant damage, no cover benefit.

| Stat | Value |
|------|-------|
| School | Evocation |
| Casting Time | 1 action |
| Range | 60 ft (4 tiles) |
| Components | V, S |
| Duration | Instantaneous |

**Effect**: Target must DEX save or take 1d8 radiant damage. No benefit from cover. Scales: 2d8 at lvl 5, 3d8 at lvl 11.

```yaml
sacred_flame:
  name: "Sacred Flame"
  type: action
  resourceCost: { action: 0 }
  range: 4
  description: "Radiant flame descends on a creature. DEX save or take damage."
  requiresTarget: true
  requiresClass: Cleric
  template:
    hit:
      save:
        stat: dex
        dc: "spell_dc"
    damage:
      base: "1d8"
      type: radiant
      addMods: []
```

### Ray of Frost 🔲 (Wizard)

> Ranged spell attack + speed reduction.

| Stat | Value |
|------|-------|
| School | Evocation |
| Casting Time | 1 action |
| Range | 60 ft (4 tiles) |
| Components | V, S |
| Duration | Instantaneous |

**Effect**: Ranged spell attack. 1d8 cold damage. Target's speed reduced by 10 ft until start of your next turn. Scales: 2d8 at lvl 5, 3d8 at lvl 11.

```yaml
ray_of_frost:
  name: "Ray of Frost"
  type: action
  resourceCost: { action: 0 }
  range: 4
  description: "A frigid beam strikes a creature, slowing it."
  requiresTarget: true
  requiresClass: Wizard
  template:
    hit:
      attackRoll:
        ability: int
        addProf: true
    damage:
      base: "1d8"
      type: cold
      addMods: []
    onHit:
      statuses:
        - id: slowed
          target: enemy
          duration: 1
          trigger: turn_start
          onTrigger: { speedReduction: 1 }
```

### Spare the Dying 🔲 (Cleric)

> Stabilize a creature at 0 HP.

| Stat | Value |
|------|-------|
| School | Necromancy |
| Casting Time | 1 action |
| Range | Touch (1 tile) |
| Components | V, S |
| Duration | Instantaneous |

**Effect**: Touch a creature at 0 HP. It becomes stable (no death saves needed).

```yaml
spare_the_dying:
  name: "Spare the Dying"
  type: action
  resourceCost: { action: 0 }
  range: 1
  description: "Stabilize a dying creature."
  requiresTarget: true
  requiresClass: Cleric
  template:
    effect: stabilize
```

### Guidance 🔲 (Cleric)

> +1d4 to one ability check. Concentration.

| Stat | Value |
|------|-------|
| School | Divination |
| Casting Time | 1 action |
| Range | Touch (1 tile) |
| Duration | Concentration, up to 1 minute |

**Effect**: Target gains +1d4 to one ability check of its choice before the spell ends.

```yaml
guidance:
  name: "Guidance"
  type: action
  resourceCost: { action: 0 }
  range: 1
  description: "Grant +1d4 to one ability check."
  requiresClass: Cleric
  concentration: true
  template:
    onHit:
      statuses:
        - id: guided
          target: ally
          duration: 10
          onTrigger: { checkBonus: "1d4", consumeOnUse: true }
```

---

## 1st Level Spells

### Magic Missile 🔲 (Wizard)

> Auto-hit force damage. Reliable.

| Stat | Value |
|------|-------|
| School | Evocation |
| Casting Time | 1 action |
| Range | 120 ft (8 tiles) |
| Duration | Instantaneous |
| Slot | 1st |

**Effect**: Three darts, each dealing 1d4+1 force damage. Always hits (no attack roll, no save). Upcast: +1 dart per slot level.

```yaml
magic_missile:
  name: "Magic Missile"
  type: action
  resourceCost: { action: 1, spellSlot: 1 }
  range: 8
  description: "Three force darts auto-hit for 1d4+1 each."
  requiresTarget: true
  requiresClass: Wizard
  template:
    hit:
      autoHit: true
    damage:
      base: "3d4+3"
      type: force
    upcast:
      perLevel: { extraDarts: 1, extraDamage: "1d4+1" }
```

### Shield 🔲 (Wizard)

> Reaction: +5 AC until start of next turn.

| Stat | Value |
|------|-------|
| School | Abjuration |
| Casting Time | 1 reaction (when hit) |
| Range | Self |
| Duration | 1 round |
| Slot | 1st |

**Effect**: +5 AC until start of your next turn, including vs triggering attack. Immune to Magic Missile.

```yaml
shield:
  name: "Shield"
  type: reaction
  resourceCost: { reaction: 1, spellSlot: 1 }
  range: self
  description: "Reaction: +5 AC until next turn."
  requiresClass: Wizard
  trigger: on_attacked
  template:
    effect:
      acBonus: 5
      duration: 1
```

### Sleep 🔲 (Wizard)

> Roll 5d8: put creatures to sleep starting from lowest HP.

| Stat | Value |
|------|-------|
| School | Enchantment |
| Casting Time | 1 action |
| Range | 90 ft (6 tiles) |
| Area | 20 ft radius |
| Duration | 1 minute |
| Slot | 1st |

**Effect**: Roll 5d8 HP. Starting from lowest HP creature in area, subtract each creature's HP. If total covers them, they fall unconscious. Undead and immune-to-charm unaffected. Upcast: +2d8 per level.

```yaml
sleep:
  name: "Sleep"
  type: action
  resourceCost: { action: 1, spellSlot: 1 }
  range: 6
  description: "Put creatures to sleep based on HP pool (5d8)."
  requiresClass: Wizard
  template:
    target:
      mode: aoe
      radius: 3
    effect: sleep_hp_pool
    hpPool: "5d8"
    upcast:
      perLevel: { extraPool: "2d8" }
```

### Cure Wounds 🔲 (Cleric, Ranger)

> Touch heal. Bread-and-butter healing.

| Stat | Value |
|------|-------|
| School | Evocation |
| Casting Time | 1 action |
| Range | Touch (1 tile) |
| Duration | Instantaneous |
| Slot | 1st |

**Effect**: Heal 1d8 + spellcasting modifier HP. Upcast: +1d8 per slot level.

```yaml
cure_wounds:
  name: "Cure Wounds"
  type: action
  resourceCost: { action: 1, spellSlot: 1 }
  range: 1
  description: "Heal 1d8 + WIS mod HP on touch."
  requiresTarget: true
  template:
    effect: heal
    healDice: "1d8"
    healMod: ability:wis
    upcast:
      perLevel: { extraHeal: "1d8" }
```

### Bless 🔲 (Cleric)

> +1d4 to attacks and saves for up to 3 creatures. Concentration.

| Stat | Value |
|------|-------|
| School | Enchantment |
| Casting Time | 1 action |
| Range | 30 ft (2 tiles) |
| Duration | Concentration, up to 1 minute |
| Slot | 1st |

**Effect**: Up to 3 creatures gain +1d4 to attack rolls and saving throws. Upcast: +1 creature per slot level.

```yaml
bless:
  name: "Bless"
  type: action
  resourceCost: { action: 1, spellSlot: 1 }
  range: 2
  description: "Up to 3 allies gain +1d4 to attacks and saves."
  requiresClass: Cleric
  concentration: true
  template:
    target:
      mode: multi
      maxTargets: 3
    onHit:
      statuses:
        - id: blessed
          target: ally
          duration: 10
          onTrigger: { attackBonus: "1d4", saveBonus: "1d4" }
```

### Hunter's Mark 🔲 (Ranger)

> Mark target for +1d6 damage on hits. Concentration.

| Stat | Value |
|------|-------|
| School | Divination |
| Casting Time | 1 bonus action |
| Range | 90 ft (6 tiles) |
| Duration | Concentration, up to 1 hour |
| Slot | 1st |

**Effect**: Mark a creature. Your weapon attacks deal +1d6 damage to it. Advantage on Survival/Perception to find it. Can move mark to new target (bonus action) if marked target drops to 0. Upcast: longer duration.

```yaml
hunters_mark:
  name: "Hunter's Mark"
  type: bonusAction
  resourceCost: { bonusAction: 1, spellSlot: 1 }
  range: 6
  description: "Mark target for +1d6 weapon damage."
  requiresTarget: true
  requiresClass: Ranger
  concentration: true
  template:
    onHit:
      statuses:
        - id: hunters_mark
          target: enemy
          duration: 60
          onTrigger: { bonusDamageOnHit: "1d6" }
```

### Healing Word 🔲 (Cleric)

> Bonus action ranged heal. Less healing but more flexible than Cure Wounds.

| Stat | Value |
|------|-------|
| School | Evocation |
| Casting Time | 1 bonus action |
| Range | 60 ft (4 tiles) |
| Duration | Instantaneous |
| Slot | 1st |

**Effect**: Heal 1d4 + spellcasting modifier. Upcast: +1d4 per slot level.

```yaml
healing_word:
  name: "Healing Word"
  type: bonusAction
  resourceCost: { bonusAction: 1, spellSlot: 1 }
  range: 4
  description: "Bonus action: heal 1d4 + WIS mod at range."
  requiresTarget: true
  requiresClass: Cleric
  template:
    effect: heal
    healDice: "1d4"
    healMod: ability:wis
    upcast:
      perLevel: { extraHeal: "1d4" }
```

---

## 2nd Level Spells

### Scorching Ray 🔲 (Wizard)

> Three ranged spell attacks, 2d6 fire each.

| Stat | Value |
|------|-------|
| School | Evocation |
| Casting Time | 1 action |
| Range | 120 ft (8 tiles) |
| Duration | Instantaneous |
| Slot | 2nd |

**Effect**: Three rays. Each is a ranged spell attack dealing 2d6 fire. Can target same or different creatures. Upcast: +1 ray per slot level.

```yaml
scorching_ray:
  name: "Scorching Ray"
  type: action
  resourceCost: { action: 1, spellSlot: 2 }
  range: 8
  description: "Three rays of fire, 2d6 each. Can split targets."
  requiresTarget: true
  requiresClass: Wizard
  template:
    hit:
      attackRoll:
        ability: int
        addProf: true
      multiAttack: 3
    damage:
      base: "2d6"
      type: fire
    upcast:
      perLevel: { extraRays: 1 }
```

### Hold Person 🔲 (Wizard, Cleric)

> Paralyze a humanoid. Concentration. WIS save each turn.

| Stat | Value |
|------|-------|
| School | Enchantment |
| Casting Time | 1 action |
| Range | 60 ft (4 tiles) |
| Duration | Concentration, up to 1 minute |
| Slot | 2nd |

**Effect**: Target humanoid must WIS save or be paralyzed. Repeat save at end of each turn. Upcast: +1 target per slot level.

```yaml
hold_person:
  name: "Hold Person"
  type: action
  resourceCost: { action: 1, spellSlot: 2 }
  range: 4
  description: "Paralyze a humanoid (WIS save each turn)."
  requiresTarget: true
  concentration: true
  template:
    hit:
      save:
        stat: wis
        dc: "spell_dc"
    onHit:
      statuses:
        - id: paralyzed
          target: enemy
          duration: 10
          trigger: turn_end
          onTrigger:
            skipTurn: true
            meleeAutocrits: true
            removeOnSave:
              stat: wis
              dc: "spell_dc"
```

### Spiritual Weapon 🔲 (Cleric)

> Bonus action: conjure floating weapon. Attack as bonus action each turn.

| Stat | Value |
|------|-------|
| School | Evocation |
| Casting Time | 1 bonus action |
| Range | 60 ft (4 tiles) |
| Duration | 1 minute (no concentration) |
| Slot | 2nd |

**Effect**: Create spectral weapon within range. Melee spell attack: 1d8 + spellcasting mod force damage. Each turn, bonus action to move weapon 20 ft and attack. Upcast: +1d8 per 2 slot levels above 2nd.

```yaml
spiritual_weapon:
  name: "Spiritual Weapon"
  type: bonusAction
  resourceCost: { bonusAction: 1, spellSlot: 2 }
  range: 4
  description: "Conjure a floating weapon. Bonus action attack each turn."
  requiresClass: Cleric
  template:
    summon: spiritual_weapon
    summonAttack:
      attackRoll:
        ability: wis
        addProf: true
      damage:
        base: "1d8"
        type: force
        addMods: [ability:wis]
    duration: 10
```

### Lesser Restoration 🔲 (Cleric, Ranger)

> Remove one condition: blinded, deafened, paralyzed, or poisoned.

| Stat | Value |
|------|-------|
| School | Abjuration |
| Casting Time | 1 action |
| Range | Touch (1 tile) |
| Duration | Instantaneous |
| Slot | 2nd |

**Effect**: End one disease or condition: blinded, deafened, paralyzed, or poisoned.

```yaml
lesser_restoration:
  name: "Lesser Restoration"
  type: action
  resourceCost: { action: 1, spellSlot: 2 }
  range: 1
  description: "Remove one condition (blind/deaf/paralyzed/poisoned)."
  requiresTarget: true
  template:
    effect: remove_condition
    conditions: [blinded, deafened, paralyzed, poisoned]
```

---

## 3rd Level Spells

### Fireball 🔲 (Wizard)

> Iconic AoE nuke. 8d6 fire in 20 ft radius. DEX save half.

| Stat | Value |
|------|-------|
| School | Evocation |
| Casting Time | 1 action |
| Range | 150 ft (10 tiles) |
| Area | 20 ft radius (3 tiles) |
| Duration | Instantaneous |
| Slot | 3rd |

**Effect**: Each creature in area must DEX save. 8d6 fire damage on fail, half on success. Ignites flammable objects. Upcast: +1d6 per slot level.

```yaml
fireball:
  name: "Fireball"
  type: action
  resourceCost: { action: 1, spellSlot: 3 }
  range: 10
  description: "Massive fire explosion. 8d6 fire, DEX save for half."
  requiresTarget: true
  requiresClass: Wizard
  template:
    target:
      mode: aoe
      radius: 3
      includeCenter: true
    hit:
      save:
        stat: dex
        dc: "spell_dc"
        halfOnSave: true
    damage:
      base: "8d6"
      type: fire
    upcast:
      perLevel: { extraDamage: "1d6" }
```

### Lightning Bolt 🔲 (Wizard)

> Line AoE. 8d6 lightning in 100 ft line. DEX save half.

| Stat | Value |
|------|-------|
| School | Evocation |
| Casting Time | 1 action |
| Range | Self (100 ft line / 7 tiles) |
| Duration | Instantaneous |
| Slot | 3rd |

**Effect**: 5 ft wide, 100 ft long line. Each creature must DEX save. 8d6 lightning on fail, half on success. Upcast: +1d6 per slot level.

```yaml
lightning_bolt:
  name: "Lightning Bolt"
  type: action
  resourceCost: { action: 1, spellSlot: 3 }
  range: 7
  description: "Lightning line: 8d6, DEX save for half."
  requiresClass: Wizard
  template:
    target:
      mode: line
      length: 7
      width: 1
    hit:
      save:
        stat: dex
        dc: "spell_dc"
        halfOnSave: true
    damage:
      base: "8d6"
      type: lightning
    upcast:
      perLevel: { extraDamage: "1d6" }
```

### Counterspell 🔲 (Wizard)

> Reaction: cancel enemy spell.

| Stat | Value |
|------|-------|
| School | Abjuration |
| Casting Time | 1 reaction (when creature casts spell) |
| Range | 60 ft (4 tiles) |
| Duration | Instantaneous |
| Slot | 3rd |

**Effect**: Attempt to interrupt creature casting a spell. If spell is 3rd level or lower, it fails. Higher level: ability check DC 10 + spell level. Upcast at higher slot: auto-succeeds if slot ≥ target spell level.

```yaml
counterspell:
  name: "Counterspell"
  type: reaction
  resourceCost: { reaction: 1, spellSlot: 3 }
  range: 4
  description: "Reaction: cancel a spell being cast."
  requiresClass: Wizard
  trigger: on_enemy_cast
  template:
    effect: counter_spell
    autoCounterLevel: 3
    checkAbility: int
```

### Revivify 🔲 (Cleric)

> Bring a creature back from death (within 1 minute, costs 300 gp diamond).

| Stat | Value |
|------|-------|
| School | Necromancy |
| Casting Time | 1 action |
| Range | Touch (1 tile) |
| Duration | Instantaneous |
| Slot | 3rd |
| Material | Diamond worth 300 gp (consumed) |

**Effect**: Touch a creature that died within the last minute. It returns to life with 1 HP. Can't restore missing body parts. Doesn't work on undead.

```yaml
revivify:
  name: "Revivify"
  type: action
  resourceCost: { action: 1, spellSlot: 3, material: "diamond_300gp" }
  range: 1
  description: "Revive a creature that died within 1 minute. Returns with 1 HP."
  requiresTarget: true
  requiresClass: Cleric
  template:
    effect: revive
    targetCondition: "dead_within_1_min"
    healTo: 1
```

### Spirit Guardians 🔲 (Cleric)

> Spirits swirl around you damaging nearby enemies. Concentration.

| Stat | Value |
|------|-------|
| School | Conjuration |
| Casting Time | 1 action |
| Range | Self (15 ft radius / 2 tiles) |
| Duration | Concentration, up to 10 minutes |
| Slot | 3rd |

**Effect**: Spectral spirits surround you in 15 ft radius. Enemies entering the area or starting turn there: WIS save or take 3d8 radiant damage (half on save). Halves enemy speed in the area. Upcast: +1d8 per slot level.

```yaml
spirit_guardians:
  name: "Spirit Guardians"
  type: action
  resourceCost: { action: 1, spellSlot: 3 }
  range: self
  description: "Spirits surround you. Enemies nearby take 3d8 radiant, WIS save half."
  requiresClass: Cleric
  concentration: true
  template:
    target:
      mode: aura
      radius: 2
      affectsEnemies: true
    hit:
      save:
        stat: wis
        dc: "spell_dc"
        halfOnSave: true
    damage:
      base: "3d8"
      type: radiant
    onTrigger:
      speedReduction: 1
    upcast:
      perLevel: { extraDamage: "1d8" }
```

---

## Spell Slot Progression (Quick Reference)

| Class Level | 1st | 2nd | 3rd |
|-------------|-----|-----|-----|
| 1 | 2 | — | — |
| 2 | 3 | — | — |
| 3 | 4 | 2 | — |
| 4 | 4 | 3 | — |
| 5 | 4 | 3 | 2 |
| 6 | 4 | 3 | 3 |
| 7 | 4 | 3 | 3 |
| 8 | 4 | 3 | 3 |
| 9 | 4 | 3 | 3 |

*Ranger gets half-caster slots (fewer): 1st at level 2, 2nd at level 5, 3rd at level 9.*

---

## Implementation Notes

### Spell Slot Tracking
The engine needs to track available spell slots per level per rest. Suggested schema in `player.yaml`:

```yaml
spellSlots:
  current: { 1: 2, 2: 0, 3: 0 }
  max: { 1: 2, 2: 0, 3: 0 }
```

### Concentration Tracking
Only one concentration spell active at a time. Store on player/actor:

```yaml
# Runtime state (not YAML config)
concentration:
  spellId: "spirit_guardians"
  remaining: 10  # turns
```

### Upcasting
Spells with `upcast` can be cast using a higher-level slot for enhanced effects. The `perLevel` object defines what changes per slot level above the base.

### Spell Save DC
`"spell_dc"` in templates is resolved at runtime: `8 + ability mod + proficiency bonus`.
