# 5e SRD Races Reference

6 core races for a tactical dungeon crawler. Each race provides ability bonuses, traits, and speed.
Based on the 5e System Reference Document.

**Status**: All 🔲 Planned (races not yet implemented in engine)

---

## Overview

| Race | Ability Bonus | Speed | Key Trait |
|------|--------------|-------|-----------|
| Human | +1 all | 30 ft (2) | Versatile, extra skill/feat |
| Elf | +2 DEX | 30 ft (2) | Darkvision, Fey Ancestry, Trance |
| Dwarf | +2 CON | 25 ft (2) | Darkvision, Poison Resistance, Stonecunning |
| Halfling | +2 DEX | 25 ft (2) | Lucky (reroll nat 1), Brave, Small |
| Half-Orc | +2 STR, +1 CON | 30 ft (2) | Darkvision, Relentless Endurance, Savage Attacks |
| Tiefling | +2 CHA, +1 INT | 30 ft (2) | Darkvision, Fire Resistance, Infernal Legacy spells |

---

## Human

> Adaptable and ambitious. Most versatile race.

- **Ability Scores**: +1 to all (STR, DEX, CON, INT, WIS, CHA)
- **Speed**: 30 ft (2 tiles)
- **Size**: Medium
- **Languages**: Common + one extra
- **Traits**: None (compensated by +1 all stats)
- **Variant (optional)**: +1 to two abilities, one skill proficiency, one feat

```yaml
human:
  name: Human
  size: medium
  speed: 2
  abilityBonus: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 }
  traits: []

human_variant:
  name: "Human (Variant)"
  size: medium
  speed: 2
  abilityBonus: { choose2: 1 }
  bonusSkill: 1
  bonusFeat: 1
  traits: []
```

---

## Elf (High Elf)

> Graceful, long-lived, magically inclined.

- **Ability Scores**: +2 DEX, +1 INT (High Elf)
- **Speed**: 30 ft (2 tiles)
- **Size**: Medium
- **Darkvision**: 60 ft
- **Traits**:
  - **Keen Senses**: Proficiency in Perception
  - **Fey Ancestry**: Advantage on saves vs charmed; immune to magic sleep
  - **Trance**: 4 hours of meditation instead of 8 hours sleep
  - **Cantrip** (High Elf): One wizard cantrip of choice

```yaml
high_elf:
  name: High Elf
  size: medium
  speed: 2
  abilityBonus: { dex: 2, int: 1 }
  darkvision: 5
  skills: [perception]
  traits:
    - id: fey_ancestry
      label: "Fey Ancestry"
      effect: { advantageVs: [charmed], immuneTo: [magic_sleep] }
    - id: trance
      label: "Trance"
      effect: { restHours: 4 }
    - id: elf_cantrip
      label: "Cantrip"
      effect: { bonusCantrip: { class: wizard, count: 1 } }
```

---

## Dwarf (Hill Dwarf)

> Sturdy, resilient, poison-resistant.

- **Ability Scores**: +2 CON, +1 WIS (Hill Dwarf)
- **Speed**: 25 ft (2 tiles, not reduced by heavy armor)
- **Size**: Medium
- **Darkvision**: 60 ft
- **Traits**:
  - **Dwarven Resilience**: Advantage on saves vs poison; resistance to poison damage
  - **Stonecunning**: Double prof on INT (History) for stonework
  - **Dwarven Toughness** (Hill): +1 HP per level

```yaml
hill_dwarf:
  name: Hill Dwarf
  size: medium
  speed: 2
  abilityBonus: { con: 2, wis: 1 }
  darkvision: 5
  traits:
    - id: dwarven_resilience
      label: "Dwarven Resilience"
      effect: { advantageVs: [poisoned], resistanceTo: [poison] }
    - id: dwarven_toughness
      label: "Dwarven Toughness"
      effect: { hpBonusPerLevel: 1 }
```

---

## Halfling (Lightfoot)

> Small, lucky, stealthy.

- **Ability Scores**: +2 DEX, +1 CHA (Lightfoot)
- **Speed**: 25 ft (2 tiles)
- **Size**: Small
- **Traits**:
  - **Lucky**: Reroll natural 1 on attack, ability check, or save (must use new roll)
  - **Brave**: Advantage on saves vs frightened
  - **Halfling Nimbleness**: Move through space of larger creatures
  - **Naturally Stealthy** (Lightfoot): Hide behind creature one size larger

```yaml
lightfoot_halfling:
  name: Lightfoot Halfling
  size: small
  speed: 2
  abilityBonus: { dex: 2, cha: 1 }
  traits:
    - id: lucky
      label: "Lucky"
      effect: { rerollNat1: true }
    - id: brave
      label: "Brave"
      effect: { advantageVs: [frightened] }
    - id: naturally_stealthy
      label: "Naturally Stealthy"
      effect: { hideBehindsLargerCreature: true }
```

---

## Half-Orc

> Fierce, tough, brutal critical hits.

- **Ability Scores**: +2 STR, +1 CON
- **Speed**: 30 ft (2 tiles)
- **Size**: Medium
- **Darkvision**: 60 ft
- **Traits**:
  - **Relentless Endurance**: Once per long rest, drop to 1 HP instead of 0
  - **Savage Attacks**: Extra damage die on melee crits
  - **Menacing**: Proficiency in Intimidation

```yaml
half_orc:
  name: Half-Orc
  size: medium
  speed: 2
  abilityBonus: { str: 2, con: 1 }
  darkvision: 5
  skills: [intimidation]
  traits:
    - id: relentless_endurance
      label: "Relentless Endurance"
      effect: { surviveAt1HP: true, perLongRest: 1 }
    - id: savage_attacks
      label: "Savage Attacks"
      effect: { extraCritDie: 1 }
```

---

## Tiefling

> Infernal heritage, fire resistance, innate spellcasting.

- **Ability Scores**: +2 CHA, +1 INT
- **Speed**: 30 ft (2 tiles)
- **Size**: Medium
- **Darkvision**: 60 ft
- **Traits**:
  - **Hellish Resistance**: Resistance to fire damage
  - **Infernal Legacy**: Thaumaturgy cantrip; Hellish Rebuke (1/day at lvl 3); Darkness (1/day at lvl 5)

```yaml
tiefling:
  name: Tiefling
  size: medium
  speed: 2
  abilityBonus: { cha: 2, int: 1 }
  darkvision: 5
  traits:
    - id: hellish_resistance
      label: "Hellish Resistance"
      effect: { resistanceTo: [fire] }
    - id: infernal_legacy
      label: "Infernal Legacy"
      effect:
        spells:
          - { id: thaumaturgy, level: 1, uses: cantrip }
          - { id: hellish_rebuke, level: 3, uses: 1, perLongRest: true }
          - { id: darkness, level: 5, uses: 1, perLongRest: true }
```

---

## Implementation Notes

Races would:
1. Live in `public/data/00_core/races.yaml`
2. Apply ability bonuses during character creation / player.yaml loading
3. Traits register as passives via the hook system
4. Player YAML adds a `race` field:

```yaml
# public/data/player.yaml
player:
  name: Adventurer
  race: half_orc        # ← new field
  class: fighter
  level: 1
```

Engine applies `races[player.race].abilityBonus` to base stats at load time. Traits register hooks like feats.
