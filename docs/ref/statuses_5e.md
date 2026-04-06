# 5e SRD Conditions & Status Effects Reference

Core conditions from the 5e System Reference Document, mapped to the project's `statuses.yaml` schema.
Each entry shows the 5e rules and the YAML equivalent for this engine.

**Status legend**: ✅ Implemented | 🔲 Planned

---

## Conditions Overview

| Condition | Key Effect | Implemented |
|-----------|-----------|-------------|
| Blinded | Can't see, auto-fail sight checks, attacks have disadvantage, attacks against have advantage | 🔲 |
| Charmed | Can't attack charmer, charmer has advantage on social checks | 🔲 |
| Frightened | Disadvantage on checks/attacks while source is in sight, can't willingly move closer | 🔲 |
| Grappled | Speed 0, ends if grappler incapacitated or forced apart | 🔲 |
| Incapacitated | Can't take actions or reactions | 🔲 |
| Paralyzed | Incapacitated, auto-fail STR/DEX saves, attacks have advantage, melee hits are auto-crits | 🔲 |
| Poisoned | Disadvantage on attacks and ability checks | ✅ |
| Prone | Disadvantage on attacks, melee attacks against have advantage, ranged have disadvantage, stand up costs half movement | 🔲 |
| Restrained | Speed 0, attacks have disadvantage, attacks against have advantage, disadvantage on DEX saves | 🔲 |
| Stunned | Incapacitated, auto-fail STR/DEX saves, attacks against have advantage | 🔲 |
| Unconscious | Incapacitated, drops items, falls prone, auto-fail STR/DEX saves, attacks have advantage, melee hits are auto-crits | 🔲 |

---

## Detailed Conditions

### Blinded 🔲

**5e Rules:**
- Can't see. Auto-fails any check requiring sight.
- Attack rolls have disadvantage.
- Attack rolls against the creature have advantage.

**Duration patterns:** Spell-based (1 round to 1 min), environmental (darkness, flash).

```yaml
blinded:
  id: blinded
  label: Blinded
  trigger: turn_start
  duration: 2
  onTrigger:
    attackDisadvantage: true
    attackedAdvantage: true
    failSightChecks: true
```

### Charmed 🔲

**5e Rules:**
- Can't attack the charmer or target charmer with harmful abilities.
- Charmer has advantage on social ability checks against the creature.

**Duration patterns:** Spell-based (1 hour typical), save-to-end each turn.

```yaml
charmed:
  id: charmed
  label: Charmed
  trigger: turn_end
  duration: 3
  onTrigger:
    cantAttackSource: true
    removeOnSave:
      stat: wis
      dc: 13
```

### Frightened 🔲

**5e Rules:**
- Disadvantage on ability checks and attack rolls while source of fear is within line of sight.
- Can't willingly move closer to the source.

**Duration patterns:** Spell/ability (1 min typical), save-to-end each turn.

```yaml
frightened:
  id: frightened
  label: Frightened
  trigger: turn_end
  duration: 3
  onTrigger:
    attackDisadvantage: true
    checkDisadvantage: true
    cantApproachSource: true
    removeOnSave:
      stat: wis
      dc: 13
```

### Grappled 🔲

**5e Rules:**
- Speed becomes 0. Can't benefit from any bonus to speed.
- Ends if grappler is incapacitated.
- Ends if effect removes creature from grappler's reach.

**Duration patterns:** Until escape (Athletics/Acrobatics vs grappler's Athletics).

```yaml
grappled:
  id: grappled
  label: Grappled
  trigger: turn_start
  duration: 99
  onTrigger:
    speedZero: true
    removeOnSave:
      stat: str
      dc: 13
      alternativeStat: dex
```

### Incapacitated 🔲

**5e Rules:**
- Can't take actions or reactions.

**Duration patterns:** Usually part of another condition (stunned, paralyzed, unconscious).

```yaml
incapacitated:
  id: incapacitated
  label: Incapacitated
  trigger: turn_start
  duration: 1
  onTrigger:
    skipTurn: true
```

### Paralyzed 🔲

**5e Rules:**
- Incapacitated. Can't move or speak.
- Auto-fails STR and DEX saving throws.
- Attacks against have advantage.
- Any melee attack that hits is a critical hit (within 5 ft).

**Duration patterns:** Ghoul touch (CON save each turn), Hold Person (WIS save each turn).

```yaml
paralyzed:
  id: paralyzed
  label: Paralyzed
  trigger: turn_end
  duration: 3
  onTrigger:
    skipTurn: true
    autoFailStrDex: true
    attackedAdvantage: true
    meleeAutocrits: true
    removeOnSave:
      stat: con
      dc: 10
```

### Poisoned ✅

**5e Rules:**
- Disadvantage on attack rolls and ability checks.

**Duration patterns:** Variable (poison type dependent). Often includes damage over time.

**Project implementation:** Currently deals damage per turn + can be saved against.

```yaml
poisoned:
  id: poisoned
  label: Poisoned
  trigger: turn_end
  duration: 3
  onTrigger:
    damageDice: "1d4"
    damageColor: 0x8bc34a
    attackDisadvantage: true
    checkDisadvantage: true
```

### Prone 🔲

**5e Rules:**
- Can only crawl (half movement) or stand up (costs half total movement).
- Disadvantage on attack rolls.
- Melee attacks against have advantage (within 5 ft).
- Ranged attacks against have disadvantage.

**Duration patterns:** Instant application, costs movement to clear.

```yaml
prone:
  id: prone
  label: Prone
  trigger: turn_start
  duration: 1
  onTrigger:
    attackDisadvantage: true
    meleeAttackedAdvantage: true
    rangedAttackedDisadvantage: true
    halfMovement: true
```

### Restrained 🔲

**5e Rules:**
- Speed becomes 0.
- Attack rolls have disadvantage.
- Attack rolls against have advantage.
- Disadvantage on DEX saving throws.

**Duration patterns:** Web (STR check to escape), grapple-upgrade, spells.

```yaml
restrained:
  id: restrained
  label: Restrained
  trigger: turn_start
  duration: 3
  onTrigger:
    speedZero: true
    attackDisadvantage: true
    attackedAdvantage: true
    dexSaveDisadvantage: true
    removeOnSave:
      stat: str
      dc: 12
```

### Stunned 🔲

**5e Rules:**
- Incapacitated. Can't move. Can speak only falteringly.
- Auto-fails STR and DEX saving throws.
- Attack rolls against have advantage.

**Duration patterns:** Usually 1 round, CON save to end.

```yaml
stunned:
  id: stunned
  label: Stunned
  trigger: turn_end
  duration: 1
  onTrigger:
    skipTurn: true
    autoFailStrDex: true
    attackedAdvantage: true
    removeOnSave:
      stat: con
      dc: 13
```

### Unconscious 🔲

**5e Rules:**
- Incapacitated. Can't move or speak. Unaware of surroundings.
- Drops whatever it's holding. Falls prone.
- Auto-fails STR and DEX saving throws.
- Attacks against have advantage.
- Melee hits within 5 ft are automatic critical hits.

**Duration patterns:** Sleep (damage wakes), 0 HP (death saves).

```yaml
unconscious:
  id: unconscious
  label: Unconscious
  trigger: turn_start
  duration: 10
  onTrigger:
    skipTurn: true
    autoFailStrDex: true
    attackedAdvantage: true
    meleeAutocrits: true
    removeOnDamage: true
```

---

## Additional Status Effects (Game-Specific)

These are already in the project or planned beyond core 5e conditions:

### Sleep ✅

Based on the Sleep spell. Target is unconscious until damaged or shaken awake.

```yaml
sleep:
  id: sleep
  label: Sleep
  trigger: turn_start
  duration: 2
  onTrigger:
    skipTurn: true
    removeOnSave:
      stat: wis
      dc: 12
    removeOnDamage: true
```

### Burning ✅

Fire damage over time. Not a core 5e condition but common in BG3.

```yaml
burning:
  id: burning
  label: Burning
  trigger: turn_start
  duration: 2
  onTrigger:
    damageDice: "1d6"
    damageColor: 0xff7043
```

### Bleeding 🔲

Damage over time from wounds. BG3-style.

```yaml
bleeding:
  id: bleeding
  label: Bleeding
  trigger: turn_end
  duration: 3
  onTrigger:
    damageDice: "1d4"
    damageColor: 0xe74c3c
    removeOnSave:
      stat: con
      dc: 10
```

### Blessed 🔲

From the Bless spell. +1d4 to attacks and saving throws.

```yaml
blessed:
  id: blessed
  label: Blessed
  trigger: turn_start
  duration: 10
  onTrigger:
    attackBonus: "1d4"
    saveBonus: "1d4"
```

### Hexed 🔲

From the Hex spell. Extra necrotic damage + disadvantage on one ability check.

```yaml
hexed:
  id: hexed
  label: Hexed
  trigger: turn_start
  duration: 10
  onTrigger:
    bonusDamageOnHit: "1d6"
    bonusDamageType: necrotic
    checkDisadvantage: true
    checkDisadvantageStat: wis
```

---

## Status Engine Notes

### Trigger Timing

| Trigger | When |
|---------|------|
| `turn_start` | Start of affected creature's turn |
| `turn_end` | End of affected creature's turn |
| `on_hit` | When creature is hit by an attack |
| `on_action` | When creature uses an action |
| `time_tick` | Every explore-mode tick (configurable ms) |

### Save-to-Remove Pattern

```yaml
removeOnSave:
  stat: con          # Ability used for save
  dc: 12             # Difficulty class
  alternativeStat: dex  # Optional: can use either stat
```

Save is attempted at the trigger timing. On success, status is removed.

### Duration

- **Number**: Decrements by 1 each trigger. Removed at 0.
- **`99`**: Effectively permanent until explicitly removed or saved against.
- **`1`**: Lasts until next trigger (typically 1 round).
